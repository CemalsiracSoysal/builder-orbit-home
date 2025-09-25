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
