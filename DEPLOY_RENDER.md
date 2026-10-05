# 🌐 LUCKY DEFENSE — 인터넷 공개 방법

이 버전은 **네 컴퓨터에서 게임 서버를 계속 켜 놓지 않아도** 다른 사람이 플레이할 수 있게 만든 배포용입니다.

## 1. GitHub에 올리기

GitHub에서 새 저장소를 하나 만들고, 이 ZIP의 파일들을 저장소 루트에 업로드합니다.

필요한 핵심 파일:
- `index.html`
- `server.js`
- `package.json`
- `render.yaml`

## 2. Render 연결

Render Dashboard → **New → Blueprint** 로 들어가서 GitHub 저장소를 연결합니다.

`render.yaml`이 자동으로 다음을 만들도록 되어 있습니다.
- `lucky-defense` Web Service
- `lucky-defense-db` PostgreSQL

Web Service의 시작 명령은 `npm start`, 포트는 Render의 `PORT` 환경변수를 사용합니다.

## 3. 배포 후

Render가 발급하는 주소 예:

`https://lucky-defense-xxxx.onrender.com`

이 주소를 친구에게 보내면 됩니다.

## 4. 랭킹

온라인 서버에서는 `DATABASE_URL`이 설정되므로 랭킹을 PostgreSQL에 저장합니다.

점수는 플레이어 ID별 최고 기록으로 관리되고, 게임 횟수도 증가합니다.

## 주의

Render 공식 문서 기준 Free Web Service는 15분 동안 요청이 없으면 일시 중지될 수 있으며, 다시 접속하면 약 1분 정도 깨어나는 시간이 생길 수 있습니다.

Free Render Postgres는 현재 30일 후 만료되는 제한이 있으므로, 장기간 운영하려면 DB 플랜 업그레이드가 필요합니다.
