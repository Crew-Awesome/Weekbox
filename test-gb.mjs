import { gameBananaApi } from './frontend/src/core/services/gamebanana/api.ts'; gameBananaApi.getMods('popular', 1, 15).then(res => console.log('Mods:', res.length)).catch(console.error);
