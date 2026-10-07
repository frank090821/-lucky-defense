# LUCKY DEFENSE WEB 27.0

- PostgreSQL 점수 등록 500 오류 수정
- 원인: lucky_scores INSERT가 7개 컬럼에 8개 값을 넣고 있던 문제
- 이제 player_id, name, score, stage, kills, time, games 7개 값을 정확히 저장
- 기존 PostgreSQL DB와 기록은 그대로 유지


## v28.0 visual/audio update
- Original loopable BGM included (`bgm_lucky_defense.wav`)
- BGM toggle button added
- Towers receive richer mechanical/core/rarity details
- Enemies receive character faces, type accents, and boss crowns
- Each map receives additional scenery and ambient particles
- Gameplay rules, fixed route/base, and PostgreSQL ranking server are preserved


## v29.0 ranking + map BGM
- PostgreSQL ranking is reset once on first v29 startup, then protected by a DB marker.
- 10 maps each have a different original loopable BGM.
- BGM automatically changes when the map changes and can be turned off from the top-right button.
