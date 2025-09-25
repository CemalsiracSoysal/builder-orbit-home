import { useMemo } from "react";
import { ArrowRight, Smartphone, Monitor, Laptop, Gauge, Lock, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "@/components/CodeBlock";

export default function Index() {
  const linuxSample = useMemo(() => `// linux_rpi_fb_stream.c
// Derleme: gcc linux_rpi_fb_stream.c -o fbstream
// Basit framebuffer okuma ve TCP ile gönderme (sıkıştırmasız)
#include <arpa/inet.h>
#include <fcntl.h>
#include <linux/fb.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "Kullanim: %s <sunucu_ip> <port>\n", argv[0]);
    return 1;
  }
  const char *server_ip = argv[1];
  int port = atoi(argv[2]);

  int fb = open("/dev/fb0", O_RDONLY);
  if (fb < 0) { perror("/dev/fb0"); return 1; }

  struct fb_var_screeninfo vinfo; struct fb_fix_screeninfo finfo;
  if (ioctl(fb, FBIOGET_FSCREENINFO, &finfo) == -1) { perror("FSCREENINFO"); return 1; }
  if (ioctl(fb, FBIOGET_VSCREENINFO, &vinfo) == -1) { perror("VSCREENINFO"); return 1; }

  long screensize = finfo.smem_len;
  unsigned char *fbp = (unsigned char *)mmap(0, screensize, PROT_READ, MAP_SHARED, fb, 0);
  if ((long)fbp == -1) { perror("mmap"); return 1; }

  int sockfd = socket(AF_INET, SOCK_STREAM, 0);
  struct sockaddr_in servaddr; memset(&servaddr, 0, sizeof(servaddr));
  servaddr.sin_family = AF_INET; servaddr.sin_port = htons(port);
  inet_pton(AF_INET, server_ip, &servaddr.sin_addr);
  if (connect(sockfd, (struct sockaddr *)&servaddr, sizeof(servaddr)) != 0) { perror("connect"); return 1; }

  // Basit başlık: width,height,bpp (4x3 byte) ardindan ham piksel
  uint32_t header[3] = { vinfo.xres, vinfo.yres, vinfo.bits_per_pixel };
  write(sockfd, header, sizeof(header));

  while (1) {
    ssize_t sent = 0; ssize_t to_send = screensize;
    while (sent < to_send) {
      ssize_t n = write(sockfd, fbp + sent, to_send - sent);
      if (n <= 0) { perror("write"); goto done; }
      sent += n;
    }
    usleep(33 * 1000); // ~30 FPS
  }

done:
  munmap(fbp, screensize); close(fb); close(sockfd);
  return 0;
}
`, []);

  const windowsSample = useMemo(() => `// win_gdi_stream.cpp
// Derleme (MinGW ör.): g++ win_gdi_stream.cpp -lgdi32 -lws2_32 -o gdistream.exe
#include <winsock2.h>
#include <windows.h>
#include <stdint.h>
#include <stdio.h>

static bool send_all(SOCKET s, const char *buf, int len){
  int sent = 0; while (sent < len){ int n = send(s, buf+sent, len-sent, 0); if(n<=0) return false; sent+=n; } return true;
}

int main(int argc, char **argv){
  if(argc<3){ printf("Kullanim: %s <sunucu_ip> <port>\n", argv[0]); return 1; }
  const char* ip = argv[1]; int port = atoi(argv[2]);

  WSADATA wsa; WSAStartup(MAKEWORD(2,2), &wsa);
  SOCKET sock = socket(AF_INET, SOCK_STREAM, 0);
  sockaddr_in sa{}; sa.sin_family = AF_INET; sa.sin_port = htons(port); sa.sin_addr.s_addr = inet_addr(ip);
  if(connect(sock, (sockaddr*)&sa, sizeof(sa))!=0){ printf("baglanti hatasi\n"); return 1; }

  HDC hScreen = GetDC(NULL);
  int width = GetSystemMetrics(SM_CXSCREEN);
  int height = GetSystemMetrics(SM_CYSCREEN);
  HDC hDC = CreateCompatibleDC(hScreen);
  HBITMAP hBitmap = CreateCompatibleBitmap(hScreen, width, height);
  SelectObject(hDC, hBitmap);

  BITMAPINFO bmi{}; bmi.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
  bmi.bmiHeader.biWidth = width; bmi.bmiHeader.biHeight = -height;
  bmi.bmiHeader.biPlanes = 1; bmi.bmiHeader.biBitCount = 32; bmi.bmiHeader.biCompression = BI_RGB;

  uint32_t header[3] = { (uint32_t)width, (uint32_t)height, 32 };
  send_all(sock, (char*)header, sizeof(header));

  size_t pitch = width * 4; size_t frameSize = pitch * height; char* buffer = (char*)malloc(frameSize);
  while(true){
    BitBlt(hDC, 0, 0, width, height, hScreen, 0, 0, SRCCOPY | CAPTUREBLT);
    GetDIBits(hDC, hBitmap, 0, height, buffer, &bmi, DIB_RGB_COLORS);
    if(!send_all(sock, buffer, (int)frameSize)) break;
    Sleep(33);
  }

  free(buffer); DeleteObject(hBitmap); DeleteDC(hDC); ReleaseDC(NULL, hScreen);
  closesocket(sock); WSACleanup();
  return 0;
}
`, []);

  const androidSample = useMemo(() => `// Android tarafı: MediaProjection (Java/Kotlin) ile ekran alımı gerekir.
// Native C++ soket gönderimi örneği (NDK):
// CMake ile bir kütüphane oluşturup aşağıdaki fonksiyonu JNI ile çağırabilirsiniz.
#include <jni.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <unistd.h>
#include <stdint.h>
#include <string.h>

extern "C" JNIEXPORT jint JNICALL
Java_com_pistream_NativeSender_sendFrame(JNIEnv* env, jobject thiz, jbyteArray frame, jint width, jint height, jint port, jstring host){
  const char* ip = env->GetStringUTFChars(host, 0);
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  sockaddr_in sa{}; sa.sin_family = AF_INET; sa.sin_port = htons(port); inet_pton(AF_INET, ip, &sa.sin_addr);
  if(connect(sock, (sockaddr*)&sa, sizeof(sa))!=0){ env->ReleaseStringUTFChars(host, ip); return -1; }

  uint32_t header[3] = { (uint32_t)width, (uint32_t)height, 32 };
  send(sock, header, sizeof(header), 0);

  jsize len = env->GetArrayLength(frame);
  jbyte* data = env->GetByteArrayElements(frame, 0);
  int sent = 0; while(sent < len){ int n = send(sock, (const char*)data + sent, len - sent, 0); if(n<=0) break; sent += n; }
  env->ReleaseByteArrayElements(frame, data, 0);
  close(sock); env->ReleaseStringUTFChars(host, ip);
  return sent;
}

// Java tarafı iskelet (MediaProjection ile RGBA elde edip JNI'ye geçirirsiniz):
// class NativeSender { static native int sendFrame(byte[] rgba, int w, int h, int port, String host); }
// ImageReader ile elde edilen her karede NativeSender.sendFrame(rgba, w, h, port, host) çağrılır.
`, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,.25),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(59,130,246,.25),transparent_50%)]" />
        <div className="container mx-auto py-20 md:py-28 text-center">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">C/C++ • Framebuffer • VNC tarzı aktarım</span>
          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight">
            Pigpu/Framebuffer ile ekranı anlık ileten
            <span className="block text-primary">C/C++ VNC-benzeri çözüm</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Android APK ve Windows EXE/MSI hedefleri için düşük gecikmeli ekran paylaşımı. Raspberry Pi/Linux üzerinde framebuffer’dan okur, Windows’ta GDI ile yakalar, Android’de MediaProjection + NDK ile aktarır.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a href="#code"><Button size="lg">Kod Örneklerine Git <ArrowRight className="ml-2" /></Button></a>
            <a href="#features"><Button size="lg" variant="secondary">Özellikler</Button></a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container mx-auto py-12 md:py-20">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Gauge className="text-primary" /> Düşük Gecikme</CardTitle>
              <CardDescription>Ham framebuffer veya isteğe bağlı sıkıştırma ile 30–60 FPS akış.</CardDescription>
            </CardHeader>
            <CardContent>
              Ham veri basit TCP üstünden iletilir. İhtiyaca göre libjpeg-turbo/AV1 gibi kodeklerle geliştirilebilir.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="text-primary" /> Güvenli Mimarî</CardTitle>
              <CardDescription>TLS, kimlik doğrulama ve erişim kısıtları eklenebilir.</CardDescription>
            </CardHeader>
            <CardContent>
              İlk sürüm basit TCP kullanır; üretimde TLS terminasyonu ve kullanıcı yönetimi önerilir.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Network className="text-primary" /> Çoklu Platform</CardTitle>
              <CardDescription>APK ve EXE/MSI kurulum paketleri hedeflenir.</CardDescription>
            </CardHeader>
            <CardContent>
              • Linux/RPi: /dev/fb0 okuma
              <br />• Windows: GDI/DXGI yakalama
              <br />• Android: MediaProjection + NDK
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PLATFORMS */}
      <section id="platforms" className="container mx-auto py-6 md:py-10">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smartphone className="text-primary" /> Android (APK)</CardTitle>
              <CardDescription>NDK + MediaProjection ile ekran aktarımı</CardDescription>
            </CardHeader>
            <CardContent>
              Gradle ile NDK yapılandırın, JNI üzerinden kareleri native katmana gönderin.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Laptop className="text-primary" /> Windows (EXE/MSI)</CardTitle>
              <CardDescription>GDI/DXGI ile ekran yakalama</CardDescription>
            </CardHeader>
            <CardContent>
              MSIX/ WiX Toolset ile kurulum paketi üretilebilir.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Monitor className="text-primary" /> RPi/Linux</CardTitle>
              <CardDescription>Framebuffer tabanlı aktarım</CardDescription>
            </CardHeader>
            <CardContent>
              /dev/fb0 üzerinden düşük seviye piksel erişimi.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CODE SAMPLES */}
      <section id="code" className="container mx-auto py-12 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold">Kod Örnekleri</h2>
        <p className="text-muted-foreground mt-2">Bu örnekler, ağ protokolü ve sıkıştırma katmanını sade tutarak mimariyi göstermeyi amaçlar.</p>
        <div className="mt-6">
          <Tabs defaultValue="linux">
            <TabsList>
              <TabsTrigger value="linux">Linux / RPi</TabsTrigger>
              <TabsTrigger value="windows">Windows</TabsTrigger>
              <TabsTrigger value="android">Android</TabsTrigger>
            </TabsList>
            <TabsContent value="linux" className="mt-4">
              <CodeBlock language="c" code={linuxSample} />
            </TabsContent>
            <TabsContent value="windows" className="mt-4">
              <CodeBlock language="cpp" code={windowsSample} />
            </TabsContent>
            <TabsContent value="android" className="mt-4">
              <CodeBlock language="cpp" code={androidSample} />
            </TabsContent>
          </Tabs>
        </div>
        <div id="download" className="mt-8 flex flex-wrap gap-3">
          <Button variant="default"><Smartphone className="mr-2" /> APK hedefi: Android Studio + NDK</Button>
          <Button variant="secondary"><Laptop className="mr-2" /> EXE/MSI: Visual Studio / CMake + WiX/MSIX</Button>
        </div>
      </section>

      {/* NOTICE ABOUT NATIVE BUILD PIPELINE */}
      <section className="container mx-auto pb-16">
        <Card>
          <CardHeader>
            <CardTitle>Önemli Not</CardTitle>
            <CardDescription>Bu web arayüzü, projenin dokümantasyonunu ve planını sunar.</CardDescription>
          </CardHeader>
          <CardContent>
            Native C/C++ APK ve EXE/MSI derlemeleri mevcut web proje ortamında doğrudan üretilemez. Kendi yerel depo/CI ortamınızda derlemeniz gerekir. Harici bir depo ile devam etmek için:
            <ul className="list-disc pl-6 mt-3 space-y-1">
              <li>GitHub/yerel depo bağlayın veya VS Code eklentisi/CLI kullanın: https://www.builder.io/c/docs/projects-github, https://www.builder.io/c/docs/projects-local-repo, https://www.builder.io/c/docs/projects-vscode</li>
              <li>Android için: MediaProjection izinleri (MANAGE_OVERLAY, FOREGROUND_SERVICE) ve ekran yakalama akışını kurun.</li>
              <li>Windows için: DXGI Desktop Duplication daha performanslıdır; GDI basit bir başlangıçtır.</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
