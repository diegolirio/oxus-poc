// Reanimated 4 nao inicializa sob Jest. O expo-router/testing-library registra
// o proprio mock dele (expo-router/build/testing-library/mocks.js), que carrega
// react-native-reanimated/mock -- e esse mock oficial falha no SDK 58
// ("setCSSEventHandler is not available in JSReanimated"), entao o expo-router
// cai num objeto vazio e o layout quebra em Easing.elastic. Substituimos o
// caminho que ele carrega por um mock minimo, com so o que o app usa; ao usar
// uma API nova do Reanimated, acrescente-a aqui.
jest.mock('react-native-reanimated/mock', () => {
  const { View } = require('react-native');
  class Keyframe {
    duration() {
      return this;
    }
    delay() {
      return this;
    }
  }
  const animacao = { duration: () => animacao, delay: () => animacao };
  const easing = () => (t) => t;
  return {
    __esModule: true,
    default: { View },
    Keyframe,
    FadeIn: animacao,
    Easing: { elastic: easing, linear: (t) => t, ease: (t) => t, bezier: easing, in: easing, out: easing, inOut: easing },
  };
});
