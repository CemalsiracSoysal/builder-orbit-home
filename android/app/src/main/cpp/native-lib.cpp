#include <jni.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <unistd.h>
#include <cstdint>
#include <cstring>

extern "C"
JNIEXPORT jint JNICALL
Java_com_pistream_app_MainActivity_sendFrame(JNIEnv* env, jobject /*thiz*/, jbyteArray frame, jint width, jint height, jint port, jstring host) {
    const char* ip = env->GetStringUTFChars(host, nullptr);
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    sockaddr_in sa{}; sa.sin_family = AF_INET; sa.sin_port = htons(port); inet_pton(AF_INET, ip, &sa.sin_addr);
    if (connect(sock, (sockaddr*)&sa, sizeof(sa)) != 0) { env->ReleaseStringUTFChars(host, ip); return -1; }

    uint32_t header[3] = { (uint32_t)width, (uint32_t)height, 32 };
    send(sock, header, sizeof(header), 0);

    jsize len = env->GetArrayLength(frame);
    jbyte* data = env->GetByteArrayElements(frame, nullptr);
    int sent = 0; while (sent < len) { int n = send(sock, (const char*)data + sent, len - sent, 0); if (n <= 0) break; sent += n; }
    env->ReleaseByteArrayElements(frame, data, 0);
    close(sock); env->ReleaseStringUTFChars(host, ip);
    return sent;
}
