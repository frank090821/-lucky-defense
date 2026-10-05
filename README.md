# LUCKY DEFENSE WEB 26.0

- 점수 등록 400 오류 진단/수정 버전
- 점수 등록 요청에서 HTTP 오류와 서버 오류 메시지를 게임 화면에 표시
- 브라우저 콘솔에 실제 전송값 기록
- 게임 오버 점수 중복 제출 방지
- 서버의 점수 API가 DB 연결 오류/입력 오류를 구분해 상태 코드 반환
- PostgreSQL 영구 랭킹 구조 유지

배포 후 `/health`에서 `database: "postgres"`, `persistentRanking: true`인지 확인하세요.
기존 Render PostgreSQL DB는 삭제하거나 새로 만들지 말고 같은 DB를 계속 연결하세요.
