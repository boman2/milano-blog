# Firebase 설정 가이드

블로그의 실시간 데이터와 로그인을 위해 Firebase 프로젝트를 연결해야 합니다. 다음 단계를 따라주세요.

## 1. Firebase 프로젝트 생성
1. [Firebase 콘솔](https://console.firebase.google.com/)에 접속합니다.
2. '프로젝트 추가'를 클릭하고 이름을 정합니다 (예: `my-personal-blog`).
3. Google 애널리틱스는 선택 사항입니다(여기서는 제외해도 무방합니다).

## 2. 웹 앱 등록 및 설정값 가져오기
1. 프로젝트 메인에서 `</>` (웹) 아이콘을 클릭합니다.
2. 앱 닉네임을 입력하고 '앱 등록'을 클릭합니다.
3. 화면에 나타나는 `firebaseConfig` 객체 안의 값들을 복사해둡니다.

## 3. 기능 활성화 (콘솔 좌측 메뉴)
- **Authentication**: 'Build' > 'Authentication' > 'Get Started' 클릭 후 'Google' 또는 'Email/Password' 활성화.
- **Firestore Database**: 'Build' > 'Firestore' > 'Create database' 클릭. 규칙은 우선 'Test mode'로 시작하세요.
- **Storage**: 'Build' > 'Storage' > 'Get Started' 클릭. (이미지 업로드용)

## 4. 환경 변수 설정
프로젝트 루트 폴더에 `.env.local` 파일을 만들고 아래 내용을 복사한 뒤 본인의 값으로 채워주세요.

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=본인의_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=본인의_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=본인의_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=본인의_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=본인의_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=본인의_APP_ID
```
