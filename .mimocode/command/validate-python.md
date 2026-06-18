---
description: "Validate Python file syntax before deployment"
---

# Validate Python Command

Check that a Python file compiles without syntax errors using Python 3.14.

## Usage

```
validate-python <file_path>
```

## Examples

```
validate-python bot/handlers.py
validate-python api.py
validate-python run_polling.py
```

## Implementation

```powershell
py -3.14 -c "import py_compile; py_compile.compile(r'$1', doraise=True)"
```

Or for more detailed error messages:

```powershell
py -3.14 -c "import ast; ast.parse(open(r'$1', encoding='utf-8').read()); print('Syntax OK: $1')"
```

## Notes

- Always use `py -3.14` to ensure correct Python version
- File path should be absolute or relative to project directory
- Returns exit code 0 on success, non-zero on syntax error
