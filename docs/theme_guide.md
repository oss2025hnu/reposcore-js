# 사용자 정의 테마 가이드

이 문서는 커밋 `2c40dc2`에서 추가된 테마 기능을 사용하여 차트, 테이블, 콘솔 로그의 시각적 스타일을 커스터마이징하는 방법을 설명합니다. `themes.json` 파일을 통해 출력물의 색상과 스타일을 조정할 수 있습니다.

## 개요

테마 기능을 사용하면 다음 요소의 스타일을 커스터마이징할 수 있습니다:

- **콘솔 로그** (텍스트 색상)
- **테이블** (헤더 및 테두리 색상)
- **차트** (배경, 텍스트, 그리드, 막대 색상)

테마는 `themes.json` 파일에 정의되며, `ThemeManager` 클래스에서 로드됩니다. 기본적으로 `default`와 `dark` 두 가지 테마가 제공됩니다. 명령줄 옵션을 사용하여 테마를 전환하거나 새로운 테마를 만들 수 있습니다.

## `themes.json` 구조

`themes.json` 파일은 JSON 객체로, 각 키는 테마 이름(예: `myTheme`)을 나타냅니다. 각 테마는 `colors`, `table`, `chart`라는 세 가지 주요 섹션으로 구성됩니다.

### 구조 및 필드 설명

```json
{
  "myTheme": {
    "colors": {
      "primary": "hexColor",
      "secondary": "hexColor",
      "background": "hexColor",
      "text": "hexColor"
    },
    "table": {
      "head": ["colorName"],
      "border": ["colorName"]
    },
    "chart": {
      "backgroundColor": "hexColor",
      "textColor": "hexColor",
      "gridColor": "hexColor",
      "barColors": {
        "first": "rgbColor",
        "second": "rgbColor",
        "third": "rgbColor",
        "others": "rgbColor"
      }
    }
  }
}
```

- `myTheme`: 사용자 정의 테마 이름.
- `colors`:
  - `primary`: 기본 UI 요소 색상 (16진수 색상, 예: `#007bff`는 파란색).
  - `secondary`: 보조 색상 (16진수 색상, 예: `#6c757d`는 회색).
  - `background`: 배경 색상 (16진수 색상, 예: `#ffffff`는 흰색).
  - `text`: 콘솔 로그 텍스트 색상 (16진수 색상, 예: `#212529`는 어두운 회색).
- `table`:
  - `head`: 테이블 헤더 색상 (배열 형식, 예: `["yellow"]`는 노란색).
  - `border`: 테이블 테두리 색상 (배열 형식, 예: `["gray"]`는 회색).
- `chart`:
  - `backgroundColor`: 차트 배경 색상 (16진수 색상, 예: `#ffffff`는 흰색).
  - `textColor`: 차트 텍스트 색상 (16진수 색상, 예: `#212529`는 어두운 회색).
  - `gridColor`: 차트 그리드 색상 (16진수 색상, 예: `#e9ecef`는 밝은 회색).
  - `barColors`: 차트 막대 색상 (객체 형식).
    - `first`: 1위 참가자의 색상 (RGB 형식, 예: `rgb(255, 215, 0)`는 금색).
    - `second`: 2위 참가자의 색상 (RGB 형식, 예: `rgb(192, 192, 192)`는 은색).
    - `third`: 3위 참가자의 색상 (RGB 형식, 예: `rgb(205, 127, 50)`는 동색).
    - `others`: 나머지 참가자의 색상 (RGB 형식, 예: `rgb(169, 169, 169)`는 회색).

### 예시 `themes.json`

다음은 `default`와 `dark` 테마를 포함한 예시 `themes.json` 파일입니다:

```json
{
  "default": {
    "colors": {
      "primary": "#007bff",
      "secondary": "#6c757d",
      "background": "#ffffff",
      "text": "#212529"
    },
    "table": {
      "head": ["yellow"],
      "border": ["gray"]
    },
    "chart": {
      "backgroundColor": "#ffffff",
      "textColor": "#212529",
      "gridColor": "#e9ecef",
      "barColors": {
        "first": "rgb(138, 43, 226)",
        "second": "rgb(144, 238, 144)",
        "third": "rgb(100, 200, 100)",
        "others": "rgb(169, 169, 169)"
      }
    }
  },
  "dark": {
    "colors": {
      "primary": "#0d6efd",
      "secondary": "#6c757d",
      "background": "#212529",
      "text": "#f8f9fa"
    },
    "table": {
      "head": ["cyan"],
      "border": ["gray"]
    },
    "chart": {
      "backgroundColor": "#212529",
      "textColor": "#f8f9fa",
      "gridColor": "#495057",
      "barColors": {
        "first": "rgb(255, 215, 0)",
        "second": "rgb(192, 192, 192)",
        "third": "rgb(205, 127, 50)",
        "others": "rgb(169, 169, 169)"
      }
    }
  }
}
```

## 테마 사용 방법

### 1. `themes.json` 생성 또는 수정

- 프로젝트 루트 디렉토리에 `themes.json` 파일을 생성합니다 (없는 경우).
- 위 구조를 참고하여 사용자 정의 테마를 추가합니다.
- 파일을 저장합니다.

### 2. 테마 적용하기

`--change-theme` 옵션을 사용하여 원하는 테마를 적용할 수 있습니다.

#### 예시: `dark` 테마 적용

```bash
node index.js -r oss2025hnu/reposcore-js -f chart --change-theme dark -o results
```

- 이 명령어는 `dark` 테마를 적용하여 차트를 생성합니다.

#### 예시: 사용자 정의 테마 적용

`themes.json`에 `myTheme`라는 테마를 추가했다면:

```bash
node index.js -r oss2025hnu/reposcore-js -f chart --change-theme myTheme -o results
```

### 3. 새로운 테마 생성하기

`--create-theme` 옵션을 사용하여 명령줄에서 새 테마를 추가할 수 있습니다.

#### 예시: 새 테마 생성

```bash
node index.js --create-theme '{"name": "myTheme", "theme": {"colors": {"primary": "#ff0000", "secondary": "#00ff00", "background": "#000000", "text": "#ffffff"}, "table": {"head": ["blue"], "border": ["white"]}, "chart": {"backgroundColor": "#000000", "textColor": "#ffffff", "gridColor": "#444444", "barColors": {"first": "rgb(255, 0, 0)", "second": "rgb(0, 255, 0)", "third": "rgb(0, 0, 255)", "others": "rgb(128, 128, 128)"}}}}'
```

- 이 명령어는 `myTheme`라는 새 테마를 생성하여 `themes.json`에 추가합니다.

## 첫 시작을 위한 팁

- **기본 테마에서 시작하기**: `default` 테마를 복사한 뒤 색상을 조금씩 수정하여 나만의 테마를 만들어 보세요.

- **작은 변경부터 테스트**: 한 번에 한 색상(예: `textColor`)만 변경하고 결과를 확인하세요.

- **색상 형식**:

  - `colors.text`, `table.head`, `table.border`는 16진수 색상(예: `#ffffff`) 또는 색상 이름(예: `yellow`, `cyan`)을 사용합니다.
  - `chart` 필드는 16진수 색상(예: `#ffffff`) 또는 RGB 형식(예: `rgb(255, 215, 0)`)을 사용합니다.

- **사용 가능한 테마 확인**: 사용 가능한 테마 목록을 보려면 잘못된 테마 이름을 입력해 보세요:

  ```bash
  node index.js --change-theme invalid
  ```

## 문제 해결

- **테마가 적용되지 않음**: `themes.json` 파일이 프로젝트 루트에 있는지, 테마 이름이 정확한지 확인하세요.
- **잘못된 색상**: 유효한 색상 이름 또는 16진수/RGB 값을 사용하세요. 잘못된 값은 기본 테마로 대체됩니다.
- **필드 누락**: 테마에 일부 필드가 누락된 경우 `default` 테마의 값이 사용됩니다.