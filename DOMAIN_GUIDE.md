# 개인 블로그 도메인 연결 및 배포 가이드

개발된 블로그를 실제 도메인(예: `www.myblog.com`)으로 연결하여 전 세계 어디서든 접속할 수 있게 만드는 방법입니다.

## 1. Firebase Hosting 사용하기 (추천)

Firebase 프로젝트가 이미 구축되어 있으므로 가장 효율적인 방법입니다.

### 단계 A: 배포 준비
1. 터미널에서 다음 명령어를 실행하여 배포 도구를 설치합니다.
   ```bash
   npm install -g firebase-tools
   ```
2. 로그인 및 초기화를 수행합니다.
   ```bash
   firebase login
   firebase init hosting
   ```
   - `What do you want to use as your public directory?` -> **out**
   - `Configure as a single-page app?` -> **Yes**
   - `Set up automatic builds and deploys with GitHub?` -> **No** (필요시 Yes)

3. 빌드 및 배포:
   ```bash
   npm run build
   firebase deploy
   ```

### 단계 B: 도메인 연결
1. [Firebase 콘솔](https://console.firebase.google.com/) 접속 -> **Hosting** 메뉴 이동.
2. **맞춤 도메인 추가** 버튼 클릭.
3. 소유하신 도메인을 입력하고, 제공되는 **A 레코드(IP 주소)** 값을 도메인 구매 사이트(가비아, 후이즈 등)의 DNS 설정에 입력합니다.

---

## 2. Vercel 사용하기 (가장 간편함)

Next.js 제작사에서 제공하는 서비스로, 설정이 매우 간단합니다.

1. [Vercel](https://vercel.com/)에 가입하고 GitHub 저장소를 연결합니다.
2. **Environment Variables** 설정 섹션에 `.env.local`에 적었던 6가지 Firebase 설정을 그대로 입력합니다.
3. **Deploy** 버튼을 누르면 배포가 완료됩니다.
4. **Settings -> Domains** 메뉴에서 본인의 도메인을 추가하고 안내되는 CNAME/A 레코드를 DNS에 등록하면 끝입니다.

---

## 💡 팁
- 도메인이 아직 없으시다면 **Namecheap** 또는 **Google Domains** 등에서 저렴하게 구매하실 수 있습니다.
- SSL(https)은 Firebase나 Vercel에서 무료로 자동 제공합니다.
