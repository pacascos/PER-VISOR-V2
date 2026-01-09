# Zarpeo Icon Library (v2) — SVG (corporate colored)

Formato: SVG outline 24x24. Por defecto usa el color corporativo **Azul Océano #0E6BA8**.

## Contenido
- `*.svg` (archivos individuales, ya con stroke corporativo)
- `sprite.svg` (sprite para `<use>`)
- `ZIcon.tsx` (helper React)
- `zarpeo-icons.css` (color corporativo via CSS var)
- `demo.html` (preview)

## Uso (Sprite)
1) Inserta `sprite.svg` inline una vez.
2) Referencia iconos:

```html
<svg class="zicon md">
  <use href="#zarpeo-anchor"></use>
</svg>
```

## Cambiar color global (CSS variable)
```css
:root {
  --zarpeo-icon-color: #0B3C5D;
}
```

## Nuevos iconos incluidos
### PER (exámenes)
- `per-exam`, `quiz`, `timer`, `certificate`, `book-nautical`

### Gestión de usuarios
- `users`, `user-plus`, `shield`, `settings`, `login`, `logout`
