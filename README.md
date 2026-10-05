# LUCKY DEFENSE WEB 27.0

- PostgreSQL 점수 등록 500 오류 수정
- 원인: lucky_scores INSERT가 7개 컬럼에 8개 값을 넣고 있던 문제
- 이제 player_id, name, score, stage, kills, time, games 7개 값을 정확히 저장
- 기존 PostgreSQL DB와 기록은 그대로 유지
