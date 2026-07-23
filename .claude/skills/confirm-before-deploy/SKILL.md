---
name: confirm-before-deploy
description: >
  Use this skill whenever you are about to deploy any app for this user (account
  sd38317-wq) — flyctl deploy, git push to a production branch, or any equivalent
  "ship it" action, on ANY of this user's projects (barun, luii, sms-relay, or any
  future app). Applies regardless of which repo or session you're in. ALWAYS check
  this skill before running a deploy command.
---

# 배포 전 "다른 작업 더 있는지" 확인

## 규칙

코드 수정을 마치고 배포(`flyctl deploy` 등)하기 직전에, 실제로 배포 명령을 실행하기 전에
**항상 사용자에게 먼저 물어본다**: "배포하기 전에 같이 넣고 싶은 다른 작업 있으세요?"

이건 barun/luii/sms-relay뿐 아니라 앞으로 이 사용자의 어떤 프로젝트에서 작업하든
동일하게 적용되는 규칙이다 — 특정 앱에 국한된 게 아니라 이 사용자와의 작업 방식 전반에 대한 것.

## 왜 이 규칙이 있는지

한 세션에서 버그 수정·UI 조정·기능 추가가 이어질 때마다 매번 바로바로 `flyctl deploy`를
실행했더니, 배포가 너무 잦아졌다(작은 변경 하나마다 롤링 재시작 발생). 사용자가 명시적으로
"배포하기 전에 항상 다른 작업 추가할 게 있는지 물어봐달라"고 요청했다 — 관련 있는 변경들을
한 번의 배포로 묶고 싶어함.

## 적용 방법

- 코드 변경이 준비되고(필요시 curl/로컬 테스트 등으로 검증까지 끝난) 배포 직전 시점에 확인 질문을 한다.
- 사용자가 "없어, 바로 배포해" 등으로 명시적으로 넘어가면 그 응답에 따라 바로 배포해도 된다 — 매번
  기계적으로 막는 게 아니라, 배포 직전에 한 번 확인하는 절차 자체가 핵심이다.
- 사용자가 이미 "그냥 계속 진행해" 같은 자동 진행을 명시적으로 요청한 경우, 혹은 정말 단발성 요청
  하나뿐이고 다른 맥락이 없는 경우는 매번 물어보지 않고 스킵해도 된다.
- 이 스킬은 barun, luii 저장소 양쪽에 동일하게 둬서, 어느 프로젝트에서 세션을 시작하든 적용되게 한다.
  새 프로젝트를 만들 때도 이 파일을 그 프로젝트의 `.claude/skills/confirm-before-deploy/SKILL.md`에
  복사해서 이어간다.
