# PayFlow — Smart Payment Orchestration

PayFlow es una plataforma de **orquestación inteligente de pagos** que conecta tu checkout con múltiples procesadores (Stripe, PayPal, Adyen, Square, etc.) y rutas cada transacción al más óptimo en tiempo real usando ML.

## 🚀 Características

- **Smart Routing** — Elige automáticamente el procesador más barato/confiable por transacción
- **Fallback automático** — Si un procesador falla, reintenta con otro sin que el cliente lo note
- **Recuperación de falsos rechazos** — +3-8% de ingresos recuperados
- **Dashboard unificado** — Todas las transacciones, fees y ahorros en un solo lugar
- **SDK open source** — Integración simple, código auditabable
- **Ahorro 10-30%** — En fees de procesamiento vs un solo procesador

## 📦 Estructura del proyecto

```
payflow/
├── packages/
│   ├── shared/          # Tipos y modelos compartidos
│   ├── payflow-sdk/     # SDK Core (Smart Router, adapters, client)
│   ├── payflow-server/  # REST API (Fastify)
│   └── payflow-dashboard/ # Dashboard React + Vite
├── index.html           # Landing page promocional
├── start-payflow.ps1    # Script de arranque
└── package.json         # Monorepo workspace
```

## 🔧 Quick Start

```bash
# Instalar dependencias
npm install

# Iniciar servidor (local mode, sin API keys reales)
$env:PAYFLOW_MODE = "local"
npx tsx packages/payflow-server/src/index.ts

# Iniciar dashboard (otra terminal)
cd packages/payflow-dashboard
npx vite --port 5173

# O usar el script todo-en-uno
.\start-payflow.ps1
```

## 🧪 Tests

```bash
npx vitest run
```

## 💡 Cómo funciona

1. **Configuras** tus procesadores (Stripe, PayPal, etc.) en el SDK
2. **PayFlow evalúa** 10+ factores por transacción (costo, tasa de éxito, geografía, tipo de tarjeta)
3. **El Smart Router** selecciona el procesador óptimo en milisegundos
4. **Si falla**, reintenta automáticamente con el siguiente mejor procesador
5. **Dashboard** muestra cada transacción, ruta, fee y ahorro

## 📊 Pricing

| Plan | Precio |
|------|--------|
| Starter | $29/mes (primeros $10K gratis) |
| Transaction fee | 2.0% + $0.20 |
| Fraud Shield | $99/mes |
| Instant Settlement | 0.5% extra |
| Analytics Pro | $49/mes |

## 🔒 Seguridad

- PCI DSS Level 1 compliant
- AES-256 encryption
- Tokenización de datos de tarjeta
- Open source — código auditabable en GitHub
- 3D Secure integrado

## 🗺️ Roadmap

- [x] Sprint 1: MVP Core (router rule-based + Stripe + PayPal)
- [ ] Sprint 2: ML routing + decline recovery
- [ ] Sprint 3: Producción (PCI DSS, fraud detection, escalabilidad)
- [ ] Sprint 4: Crecimiento (stablecoins, plugins ecommerce, mobile SDK)
