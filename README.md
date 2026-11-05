# DELTA LAB KR

델타포스 전면전 총기 모딩 계산기. 69종 무기와 583개 파츠를 지원하는 비공식 팬 도구입니다.

온라인: https://alphamanda0507-sketch.github.io/test/

데이터 출처: https://dfttk.com/battlefield/builder

현재 모딩 유지·개선 / 균형 추천 / 스탯 배제 / 파츠 호환성과 중첩 조준경 / 정밀 보정을 지원합니다. 제한된 탐색이며 전역 최적값을 보장하지 않습니다. DFLAB1 코드는 델타랩 복원용이며 게임용 공유 코드가 아닙니다.

## 배포

`deployment/site.tar.gz.part-*`를 이름 순서대로 합친 tar.gz에 전체 정적 사이트와 원본 데이터가 들어 있습니다. GitHub Actions가 체크섬을 검증하고 압축을 풀어 GitHub Pages에 배포합니다. 방문자는 압축을 풀거나 로그인할 필요가 없습니다. 파일별 원본은 다음과 같이 복원할 수 있습니다.

```sh
cat deployment/site.tar.gz.part-* > site.tar.gz
mkdir public
tar -xzf site.tar.gz -C public
```

현재 배포 파일은 `complete-20261105-r6`입니다. 데이터는 수집한 스냅샷이며 원본 사이트 변경을 실시간 자동 반영하지 않습니다. 무기 외형 이미지 조각은 원본 사이트에서 불러옵니다.
