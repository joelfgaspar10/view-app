# Debug de Notificações Locais (Expo)

Checklist rápido:
1. Permissões concedidas? (primeiro toggle deve pedir; senão verificar definições do SO)
2. Canal Android criado antes de agendar? (ensureNotificationPermissions precisa correr antes do schedule)
3. Trigger futuro válido? (Date > Date.now())
4. Identificadores únicos (não sobrescrever).
5. Rebuild após instalar `expo-notifications`.
6. Testar em dispositivo físico (simulador iOS pode falhar ou silenciar).

## Passos de teste mínimos
```
await ensureNotificationPermissions();
const fire = new Date(Date.now() + 5000);
const id = await scheduleLocalRelease('test-5s', 'Teste 5s', 'Corpo', fire);
console.log('scheduled', id, fire.toISOString());
```
Depois: `Notifications.getAllScheduledNotificationsAsync()` deve listar `test-5s`.

## Causas comuns de falha
- Data ISO sem hora (interpreta meia noite passada e não dispara).
- App fechado à força antes do horário (Android antigo ou modo economia energia).
- Canal Android com importance baixa.
- Permissões alteradas nas definições depois de concedidas.

Remover todas: `cancelScheduledNotificationAsync` para cada identifier listado.
