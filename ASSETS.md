# Источники текстур

Все изображения находятся в `public/textures/` и используются локально, без внешних запросов
во время работы приложения.

## Карты планет и Луны

| Файл | Источник | Примечание |
| --- | --- | --- |
| `earth_day.jpg`, `earth_clouds.png`, `earth_night.png`, `earth_normal.jpg`, `earth_specular.jpg`, `moon.jpg` | NASA / three.js examples (`examples/textures/planets`) | Blue Marble, облака, ночные огни, нормали и блики Земли; карта Луны LRO |
| `sun.jpg`, `mercury.jpg`, `mercury_bump.jpg`, `venus.jpg`, `venus_bump.jpg`, `mars.jpg`, `mars_bump.jpg`, `jupiter.jpg`, `saturn.jpg`, `uranus.jpg`, `neptune.jpg`, `pluto.jpg`, `pluto_bump.jpg`, `moon_bump.jpg` | Solar System Scope (CC BY 4.0), зеркало `jeromeetienne/threex.planets` | базовые карты 1k–2k, часть файлов увеличена до 2048×1024 с лёгким повышением резкости |
| `saturn_ring_src.jpg` | Solar System Scope (CC BY 4.0) | исходный профиль колец; итоговая карта `saturn_ring.png` сгенерирована заново |

Solar System Scope: https://www.solarsystemscope.com/textures/ (CC BY 4.0).

## Сгенерированные ассеты

Созданы скриптом `tools/generate_assets.py` (numpy + Pillow):

- `moon_io.jpg`, `moon_europa.jpg`, `moon_ganymede.jpg`, `moon_callisto.jpg`,
  `moon_mimas.jpg`, `moon_enceladus.jpg`, `moon_rhea.jpg`, `moon_titan.jpg`,
  `moon_iapetus.jpg`, `moon_miranda.jpg`, `moon_ariel.jpg`, `moon_titania.jpg`,
  `moon_oberon.jpg`, `moon_triton.jpg`, `moon_phobos.jpg`, `moon_deimos.jpg`,
  `moon_charon.jpg` — процедурные карты спутников;
- `dwarf_ceres.jpg`, `dwarf_haumea.jpg`, `dwarf_makemake.jpg`, `dwarf_eris.jpg` —
  процедурные карты карликовых планет;
- `saturn_ring.png`, `uranus_ring.png` — профили колец с делениями Кассини/Энке;
- `milkyway.jpg` — панорама Млечного Пути;
- `sun_glow.png`, `star_sprite.png` — спрайты свечения.

Сгенерированные карты — художественная реконструкция, а не измеренная фотометрия
поверхностей.
