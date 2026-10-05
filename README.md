# LUCKY DEFENSE WEB 19.0 - Public Deploy Build

이 버전은 내 PC의 localhost를 열어 두지 않아도 다른 사람들이 인터넷에서 접속할 수 있도록 만든 배포용 버전입니다.

## 가장 쉬운 배포 방법: Render

1. 이 폴더 전체를 GitHub 저장소에 올립니다.
2. Render Dashboard에서 New → Blueprint를 선택합니다.
3. GitHub 저장소를 연결하고 이 저장소의 `render.yaml`을 사용합니다.
4. `lucky-defense` Web Service와 `lucky-defense-db` Postgres가 생성되면 배포를 기다립니다.
5. 배포가 끝나면 Render가 제공하는 `https://lucky-defense-....onrender.com` 주소를 친구에게 보내면 됩니다.

### 중요한 변경점
- 서버가 `PORT` 환경변수를 사용합니다.
- 서버가 `0.0.0.0`에 바인딩되어 외부 접속을 받을 수 있습니다.
- Render가 외부 HTTPS/TLS를 처리하므로 게임 서버 내부는 HTTP로 동작합니다.
- 랭킹은 `DATABASE_URL`이 있으면 PostgreSQL에 저장됩니다.
- DB가 없으면 로컬에서는 `scores.json`으로 자동 폴백합니다.
- `/health` 상태 확인 주소가 있습니다.
- Render에서 실행될 때 브라우저를 자동으로 열지 않습니다.

## 로컬 실행

```powershell
npm.cmd install
npm.cmd start
```

`http://localhost:3000`

## 랭킹 저장 참고

Render의 무료 Web Service 파일 시스템은 영구 저장소가 아니므로, 온라인 랭킹은 함께 생성되는 PostgreSQL을 사용하도록 구성했습니다.
Render 공식 문서 기준 무료 Postgres는 30일 후 만료되므로 장기 운영하려면 유료 DB로 업그레이드하는 것이 필요합니다.



### 22.0 CHARACTER ART
모든 포탑과 몬스터의 캔버스 외형을 전용 실루엣/문양/장식 중심으로 개선했습니다. 의무병은 + 십자 메디컬 엠블럼, 용포는 날개·머리·뿔·꼬리·불꽃을 가진 실제 용 실루엣을 사용합니다. 각 희귀 대포와 정예/보스 몬스터에도 전용 문양과 장식을 추가했습니다.
