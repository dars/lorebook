/// 非 web 平台：App 由商店更新，沒有「同一份程式碼被快取住」的問題，
/// 因此不監聽、也無從重載。
void listenForAppUpdate(void Function() onUpdate) {}

void reloadApp() {}
