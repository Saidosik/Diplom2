# Aurora

Источник: https://reactbits.dev/backgrounds/aurora

`Aurora` — декоративный animated background component из React Bits. В проекте “Вектор” он планируется как фоновый жидкий градиент для auth layout.

## Назначение

Планируемое использование:

- фон страниц входа и регистрации;
- фон страниц восстановления пароля;
- фон страниц подтверждения почты;
- фон для профиля и настроек;

## Файлы

- `Aurora.source.tsx` — официальный код компонента React Bits Aurora.
- `Aurora.example.tsx` — пример использования под проект “Вектор”.
- `Aurora.integration-notes.md` — заметки по будущей интеграции.

## Важно

Компонент из этой папки нельзя импортировать напрямую в production UI.

Перед реальной интеграцией его нужно перенести в рабочую папку компонентов frontend, например:

```text
frontend/src/components/animations/Aurora.tsx