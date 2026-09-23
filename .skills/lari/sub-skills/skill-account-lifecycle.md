---
name: "Cuenta Inteligente y Auto-Seed"
description: "Manejo del ciclo de vida de cuentas y fallbacks seguros en la base de datos y UI"
---

# LARI Sub-Skill: Account Lifecycle & Auto-Seed

## Objetivo
Garantizar que ningn usuario se encuentre con una interfaz vaca (blank state) al momento de crear transacciones, y evitar dependencias frgiles entre el renderizado del frontend y la inicializacin de la base de datos.

## Reglas de Implementacin

### 1. Auto-Seed (Lado del Servidor / DB)
Al momento de consultar `getAccounts` o cualquier endpoint que sirva entidades principales:
- **Verificacin**: Si `data.length === 0` y no es el usuario de prueba (`demo-user`), SE DEBE iniciar la inyeccin automtica de entidades base.
- **Datos Base (Cuentas)**:
  - "Efectivo" (`type: cash`, `balance: 0`, `color: #10B981`)
  - "Mercado Pago" (`type: digital_wallet`, `balance: 0`, `color: #3B82F6`)
  - "Banco / Dbito" (`type: bank_account`, `balance: 0`, `color: #8B5CF6`)

### 2. Fallbacks de Formulario (Lado del Cliente)
Incluso con auto-seed asegurado, el frontend debe prever latencia o errores de red.
- Todo `<select>` de cuentas debe incluir una opcin de recoleccin condicional:
  ```tsx
  {accounts.length === 0 && (
    <option value="default_cash" className="bg-neutral-900">Efectivo (General)</option>
  )}
  ```

### 3. Recoleccin de Excepciones (Lado del POST)
Si el endpoint de insercin de transacciones recibe un payload con `account_id` vaco o `default_cash`:
- El backend buscar automticamente la cuenta principal (por convencin, "Efectivo" o la primera del ndice).
- Nunca se debe abortar la accin transaccional crtica slo por la falta de este ID si el sistema puede inferirlo.
