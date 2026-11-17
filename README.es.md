<div align="center">

# claude-eng-team

**Un equipo de ingeniería completo para [Claude Code](https://code.claude.com/docs/en/overview), en un solo comando.**

16 agentes por rol · aprobaciones que se cumplen · TDD · ADRs · threat models · flujo story → dev → prod

[![npm](https://img.shields.io/npm/v/claude-eng-team)](https://www.npmjs.com/package/claude-eng-team)
[![ci](https://github.com/romodevx/claude-eng-team/actions/workflows/ci.yml/badge.svg)](https://github.com/romodevx/claude-eng-team/actions/workflows/ci.yml)
[![licencia: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md)

</div>

```bash
npx claude-eng-team
```

Hace cinco preguntas, respalda lo que vaya a tocar e instala en `~/.claude`.
Se deshace cuando quieras con `npx claude-eng-team uninstall`.

**Contenido:** [Por qué](#por-qué) · [Requisitos](#requisitos) · [Instalación paso a paso](#instalación-paso-a-paso) ·
[Tu primera sesión](#tu-primera-sesión-paso-a-paso) · [Aprobaciones y autonomía](#aprobaciones-y-autonomía) ·
[Qué incluye](#qué-incluye) · [Skills de terceros](#skills-de-terceros) · [Actualizar, revisar, desinstalar](#actualizar-revisar-desinstalar) ·
[Problemas comunes](#problemas-comunes) · [Preguntas frecuentes](#preguntas-frecuentes) · [Menciones honoríficas](#menciones-honoríficas)

---

## Por qué

Claude Code es un gran ingeniero. Solo, es un gran ingeniero **sin equipo**: nadie pregunta qué
significa "terminado", nadie deja por escrito por qué Postgres, nadie revisa la seguridad antes
de lanzar el login, nadie frena un `git push origin main` a las 2 de la mañana.

claude-eng-team le da ese equipo y el proceso con el que trabajan las grandes empresas de
ingeniería. Describes un producto en lenguaje natural, apruebas un plan y obtienes ramas,
pruebas, revisiones y releases en los que puedes confiar, incluso mientras duermes.

## Requisitos

| | Mínimo | Probado con | Para qué |
|---|---|---|---|
| [Claude Code](https://code.claude.com/docs/en/overview) | 2.x | 2.1.323 | ejecuta el equipo |
| Node.js | 18 | 18, 22, 24 | ejecuta el instalador (`npx`) |
| git | 2.19 | 2.54 | tus proyectos; descarga los skills de terceros en commits fijos |
| Python 3 | 3.8 | 3.15 | el hook que controla las aprobaciones |
| Sistema | macOS o Linux | macOS 26, Ubuntu (CI) | los hooks y scripts son bash/Python. Windows: usa WSL |

Opcional: [Codex CLI](https://github.com/openai/codex) (delegación y relevo por cuota),
[GitHub CLI](https://cli.github.com) `gh` (PRs), Docker (pruebas de integración), [act](https://github.com/nektos/act) (CI local).

## Instalación paso a paso

### 1. Ejecuta el instalador

```bash
npx claude-eng-team
```

¿Quieres ver antes qué cambiaría? Esto no escribe nada:

```bash
npx claude-eng-team --dry-run
```

### 2. Responde cinco preguntas

| Pregunta (en inglés en la terminal) | Por defecto | Qué cambia |
|---|---|---|
| Tu nombre (para CLAUDE.md) | tu usuario del sistema | el título de tu `CLAUDE.md` global |
| Idioma en el que Claude te habla | English | el código y los docs siguen en inglés; la conversación, en tu idioma |
| ¿Usar Codex CLI para codificar y como relevo cuando Claude se queda sin cuota? | sí, si `codex` está instalado | agrega la regla de Codex, `codex-task` y los hooks de relevo |
| ¿Ejecutar comandos Bash sin pedir permiso? | no | agrega `"Bash"` a `permissions.allow`; el guard sigue preguntando por instalaciones, merges, deploys y borrado de datos |
| ¿Qué grupos de skills de terceros? | los recomendados ★ | los descarga de sus autores (ver [Skills de terceros](#skills-de-terceros)) |

¿Sin preguntas? Cada respuesta tiene su flag:

```bash
npx claude-eng-team --yes --owner "Ada" --language Spanish --no-codex --allow-bash --skills engineering,security,product
```

### 3. Qué hace en tu disco

1. Copia el equipo en `~/.claude` (o `$CLAUDE_CONFIG_DIR`): `agents/`, `rules/`,
   `standards/`, `templates/`, `skills/`, `hooks/`, `bin/` y `USAGE.md`.
2. **Respalda** cada archivo que reemplaza en `~/.claude/.claude-eng-team/backup/`, una vez.
3. `CLAUDE.md`: si no tienes uno, lo escribe. Si ya tienes, **el tuyo se queda** y se agrega
   arriba una línea, `@./claude-eng-team.md`, que importa las instrucciones del equipo.
4. **Fusiona** `settings.json`: agrega sus hooks primero y conserva todas tus opciones y hooks.
5. Descarga (con una caché en `~/.cache/claude-eng-team` o `$XDG_CACHE_HOME`) los skills de terceros que elegiste de sus repositorios originales en un commit
   fijo. Un skill que ya tengas con el mismo nombre nunca se sobrescribe.
6. Registra todo en `~/.claude/.claude-eng-team/state.json` para que `uninstall` lo deshaga.

### 4. Reinicia Claude Code

Cierra y vuelve a abrir Claude Code (o abre `/hooks` una vez) para que cargue los hooks y
agentes nuevos. Luego compruébalo:

```bash
npx claude-eng-team doctor
```

## Tu primera sesión, paso a paso

**1. Describe lo que quieres.** No necesitas comandos: abre Claude Code en un proyecto y di:

> Quiero construir un SaaS de reservas para clínicas, multi-tenant, con app móvil.

(`/new-project`, `/new-feature`, `/story` y los demás existen cuando quieras ser explícito.)

**2. La pregunta de autonomía, una vez por proyecto.** Antes del primer comando, el equipo pregunta:

> We'll run commands during this task. Run them automatically? Yes / No (I'd rather review each one)

La respuesta se guarda en `.claude/autonomy` del proyecto (ignorado por git). Ver [la tabla](#aprobaciones-y-autonomía).

**3. El equipo analiza y debate.** product-owner escribe historias con criterios
Given/When/Then, pm define alcance y métricas, architect y db-sr eligen arquitectura y base de
datos (cada decisión queda en un ADR), security hace un threat model STRIDE si hay datos de
usuario, auth o pagos, y scrum-master reúne las posiciones de todos.

**4. Un plan, y nada se ejecuta hasta que lo apruebas.** Épicas → historias → tareas →
subtareas, arquitectura, stack, riesgos, estimaciones en rangos y las preguntas que solo tú
puedes responder.

**5. Ejecución que puedes seguir.** Cada paso se anuncia en una línea:

```text
▶ backend-sr · tdd · POST /v1/bookings — idempotency key por reintentos móviles
▶ qa-sr · contract tests · API de reservas — 14 pasando contra openapi.yaml
```

Todo ocurre en ramas: una rama global `epic/…` o `story/…` desde `dev`, una rama por subtarea,
un PR a la rama global con QA y code review, luego un PR a `dev` y después un release a `main`.
Las pruebas van primero (TDD); una tarea termina solo cuando sus pruebas pasan.

**6. Tú confirmas lo importante.** Los merges a `dev`/`main`, los deploys y el borrado de datos
esperan tu sí, salvo que el proyecto esté en modo `auto`. Instalar software nuevo de terceros
siempre espera.

**7. Cuando vuelves.** Pregunta "¿cómo vamos?" (`/status`). Si usas Codex y Claude llegó a su
límite mientras no estabas, Codex siguió con el trabajo y Claude lo revisa primero.

## Aprobaciones y autonomía

Un hook `PreToolUse`, `guard-actions`, revisa cada comando Bash antes de que se ejecute
(incluso en modo bypass) y tiene su propia suite de pruebas (`~/.claude/hooks/tests/`).

| Comando | por defecto | `auto` (ideal para trabajar de noche) | `review` |
|---|---|---|---|
| builds, pruebas, levantar apps, migraciones locales, scripts | corre¹ | corre | pregunta |
| push o merge a `dev` / `main` | pregunta | corre | pregunta |
| deploys, borrado de datos, migraciones en una base remota | pregunta | corre | pregunta |
| **instalar software nuevo de terceros** (`npm i <pkg>`, `brew install`, `curl \| sh`) | **pregunta** | **pregunta** | **pregunta** |
| commit en `dev`/`main`, force push a ellas | bloqueado | bloqueado | bloqueado |

¹ Si respondiste *sí* a "ejecutar comandos Bash sin pedir permiso"; si no, aplican los avisos
normales de Claude Code. Instalar lo que el proyecto ya declara (`npm ci`, `npm install` sin
paquete, `pnpm install --frozen-lockfile`, `pip install -r requirements.txt`, `go mod download`)
no es una instalación nueva y corre. Agregar un paquete, actualizar versiones (`npm update`),
`npm create …`, `npx` de un paquete que no está en el proyecto y ejecutar código de un
`git clone` recién hecho siempre preguntan.

El guard lee los comandos como lo hace un shell (pipes, `&&`, `if`/`for`/`{ }`, `sh -c`,
heredocs, `$(…)`, envoltorios como `sudo`, `env`, `xargs`, `timeout`, `find -exec`). Es un
cinturón de seguridad contra errores, no un sandbox contra alguien decidido a evadirlo: un
nombre de programa armado en tiempo de ejecución, como `$(echo npm) i x`, no se resuelve.

Cambia el modo de un proyecto diciéndolo ("cambia a automático") o con:

```bash
~/.claude/bin/autonomy auto      # o: review | status | clear
```

## Qué incluye

**16 agentes** (`~/.claude/agents/`):

| Producto y entrega | Arquitectura y código | Calidad, operación y seguridad |
|---|---|---|
| product-owner · pm · scrum-master · project-manager · eng-manager | architect · tech-lead · backend-sr (Go) · frontend-sr (React) · mobile-sr (React Native) · db-sr | qa-sr · code-reviewer · security · devops-sr (SRE) · doc-writer |

**15 reglas** (`~/.claude/rules/`): 12 siempre cargadas (unos 18 KB; 11 y unos 15 KB sin Codex)
y las de Go, frontend y formularios, que solo se cargan al tocar esos archivos. Canon de ingeniería, pruebas, datos,
APIs, seguridad, documentación, flujo de git, flujo de módulos, feature flags, CI local y QA.

**12 estándares** (`~/.claude/standards/`), que se leen solo cuando el trabajo los necesita:
resiliencia, datos, APIs, pruebas, seguridad + checklist OWASP ASVS 5.0, presupuestos de
rendimiento web y móvil, observabilidad, entrega y respuesta a incidentes.

**19 comandos** (`~/.claude/skills/`):

| Comando | Qué hace |
|---|---|
| `/new-project` | Un proyecto desde cero hasta producción |
| `/plan` | Épicas e historias, debatidas entre roles |
| `/story <id>` | Entrega una historia o épica: ramas, PRs, QA, review |
| `/new-module <nombre>` | Rebanada vertical completa: contrato → datos + RLS → backend → frontend → flag |
| `/new-feature` | Una funcionalidad dentro de un módulo existente |
| `/adr` · `/threat-model` | Registro de decisión · STRIDE + ASVS antes de datos de usuario, auth o pagos |
| `/flags` | Flags por módulo, presets de demo, rollout por porcentaje |
| `/test` · `/deploy` | Suite completa · release gradual con rollback |
| `/hotfix` · `/postmortem` | Arreglo urgente, también con prueba primero · postmortem sin culpables |
| `/refactor` · `/redesign` | Limpieza de deuda técnica dirigida por tech-lead · hacer una pantalla más fácil sin cambiar su comportamiento |
| `/status` · `/docs` · `/feedback` · `/refresh-rules` | Avance · documentación · enseñarle a un agente · re-verificar una regla contra sus fuentes |

**10 plantillas** (`~/.claude/templates/`): `CLAUDE.md` de proyecto, CI de GitHub Actions
optimizado para ahorrar minutos, CODEOWNERS, plantilla de PR, Renovate, ADR, threat model,
runbook, postmortem y handoff.

**Stack por defecto** para proyectos nuevos: Go + GORM, React, React Native (Expo) y la base de
datos elegida por problema en un ADR. Los proyectos existentes conservan el suyo; si una
petición lo contradice, el equipo pregunta antes. Se cambia en `~/.claude/CLAUDE.md`.

## Skills de terceros

Este paquete contiene **solo trabajo original**. Durante la instalación puedes agregar grupos de
skills de la comunidad; cada uno se descarga **del repositorio de su autor en un commit fijo**,
nunca de una rama que cambia, y conserva la licencia de su autor.

| Grupo | Qué trae | Skills |
|---|---|---|
| engineering ★ | estilo y errores en Go, Postgres, React, Terraform, SLOs, minutos de CI, búsqueda de código, automatización de navegador | 10 |
| security ★ | revisión de diffs enfocada en seguridad, threat modeling, auditoría de skills | 3 |
| product ★ | historias de usuario, facilitación scrum, interrogar requisitos | 3 |
| design | oficio de UI, animación (web y Expo), sistemas de diseño | 26 |
| marketing | copywriting, CRO, SEO y AI-SEO, schema, anuncios, seguimiento de conversiones | 8 |
| context | ingeniería de contexto para agentes | 15 |
| writing | quitar las marcas de texto generado por IA; modo conciso | 2 |
| legal | revisión de cumplimiento, riesgo legal, avisos de privacidad para México | 3 |

★ = se instalan por defecto. Elige con `--skills all`, `--skills none` o `--skills design,marketing`.
La lista completa con autores, commits y licencias está en [CREDITS.md](CREDITS.md), o corre:

```bash
npx claude-eng-team credits
```

**Extras recomendados** que instalas tú, desde sus autores (el instalador imprime los comandos
exactos): [gstack](https://github.com/garrytan/gstack) (`/qa` con navegador visible,
`/review`, `/ship`, `/cso`), [superpowers](https://github.com/obra/superpowers) (skills de
depuración, TDD y planes), [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
y otros. Sin ellos, el equipo hace el mismo trabajo con las herramientas integradas de Claude Code.

## Actualizar, revisar, desinstalar

```bash
npx claude-eng-team            # actualizar: vuelve a correrlo; recuerda tus respuestas
npx claude-eng-team doctor     # requisitos + autoprueba del guard
npx claude-eng-team uninstall  # deja tus archivos exactamente como estaban
```

`uninstall` borra cada archivo que agregó, restaura cada archivo que respaldó, quita sus hooks,
la línea de import, la caché de descargas y cada carpeta que creó, y conserva cualquier cambio
que hayas hecho en `settings.json`.

Si editaste uno de los archivos del equipo después de instalar, tu edición manda:

- **Actualizar** conserva tu archivo y escribe la versión nueva al lado, como
  `<archivo>.claude-eng-team-new`, para que la combines tú. `--dry-run` los lista como `keep`.
- **Desinstalar** conserva tu archivo editado. Si había reemplazado uno tuyo, tu original vuelve
  y tu copia editada queda como `<archivo>.claude-eng-team-edited`.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| El equipo no parece activo | Reinicia Claude Code; corre `npx claude-eng-team doctor` |
| `python3 is required` | Instala Python 3.8+ y vuelve a correr el instalador |
| Un comando se bloquea: "Rule 0: no commits on 'main'" | Es intencional: crea una rama primero (`git checkout -b feature/x`) |
| Demasiadas confirmaciones | Responde *sí* a la pregunta de autonomía, o `~/.claude/bin/autonomy auto` en el proyecto |
| Falló la descarga de un skill de terceros | Revisa tu red o acceso a GitHub y vuelve a correr el instalador; continúa donde quedó |

## Preguntas frecuentes

**¿Envía mi código a algún lado?** No. Son archivos de configuración y dos hooks locales en
Python. Los skills de terceros solo se descargan de GitHub si los eliges.

**¿Va a romper mi configuración actual?** Respalda lo que reemplaza y fusiona la configuración.
Si algo no te convence: `npx claude-eng-team uninstall`.

**¿El stack es obligatorio?** No. Los proyectos existentes conservan el suyo; los nuevos lo usan
por defecto salvo que digas otra cosa.

**¿Por qué pregunta antes de instalar paquetes incluso en `auto`?** Por el riesgo de la cadena
de suministro: código nuevo de internet siempre lleva un sí humano.

**¿Necesito Codex?** No. Sin él, los agentes programan directamente; con él, le delegan el
trabajo práctico y Codex puede continuar cuando Claude llega a su límite de uso.

## Menciones honoríficas

Este proyecto se apoya en el trabajo de otras personas. Gracias:

- **Autores de skills** (se descargan de sus repos, nunca se incluyen en el paquete): Corey Haines
  ([marketingskills](https://github.com/coreyhaines31/marketingskills)), Muratcan Koylan
  ([Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering)),
  Emil Kowalski ([skills](https://github.com/emilkowalski/skills)), Next Level Builder
  ([ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)), Anthropic
  ([skills](https://github.com/anthropics/skills), [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)),
  Vercel ([agent-skills](https://github.com/vercel-labs/agent-skills), [agent-browser](https://github.com/vercel-labs/agent-browser),
  [skills](https://github.com/vercel-labs/skills)), Trail of Bits ([skills](https://github.com/trailofbits/skills)),
  OpenAI ([skills](https://github.com/openai/skills)), NVIDIA ([SkillSpector](https://github.com/NVIDIA/SkillSpector)),
  HashiCorp ([agent-skills](https://github.com/hashicorp/agent-skills)), Supabase
  ([agent-skills](https://github.com/supabase/agent-skills)), GitHub
  ([awesome-copilot](https://github.com/github/awesome-copilot)), Samuel Berthe
  ([cc-skills-golang](https://github.com/samber/cc-skills-golang)), Seth Hobson
  ([agents](https://github.com/wshobson/agents)), Pawel Huryn ([pm-skills](https://github.com/phuryn/pm-skills)),
  Alireza Rezvani ([claude-skills](https://github.com/alirezarezvani/claude-skills)), Matt Pocock
  ([skills](https://github.com/mattpocock/skills)), Siqi Chen ([humanizer](https://github.com/blader/humanizer)),
  Julius Brussee ([caveman](https://github.com/JuliusBrussee/caveman)), Uizze ([uizze](https://github.com/uizze/uizze)),
  Netresearch ([file-search-skill](https://github.com/netresearch/file-search-skill)) y arrobabeto vía
  ThomasMoreAI ([legal-skills-open](https://github.com/ThomasMoreAI/legal-skills-open)).
- **Herramientas que inspiraron el flujo:** [gstack](https://github.com/garrytan/gstack) de Garry Tan,
  [superpowers](https://github.com/obra/superpowers) de Jesse Vincent,
  [claude-mem](https://github.com/thedotmack/claude-mem) de Alex Newman, [Codex CLI](https://github.com/openai/codex)
  de OpenAI y [Claude Code](https://code.claude.com/docs/en/overview) de Anthropic.
- **Ideas y libros:** Robert C. Martin (*Clean Code*, *Clean Architecture*, *The Clean Coder*),
  Alan Donovan y Brian Kernighan (*The Go Programming Language*), [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
  y los [libros de SRE de Google](https://sre.google/books/). El paquete parafrasea sus principios
  y no contiene texto de ellos.

Commits y licencias exactos: [CREDITS.md](CREDITS.md).

## Contribuir

Issues y PRs bienvenidos: ver [CONTRIBUTING.md](CONTRIBUTING.md). Reportes de seguridad:
[SECURITY.md](SECURITY.md).

## Licencia

Trabajo original © Andres Romo ([ROMOLABS](https://github.com/romodevx)), [MIT](LICENSE).
Los skills de terceros pertenecen a sus autores, bajo sus propias licencias.
