const css = String.raw;

// TODO: do not use this particular set of css animations
// Consider using a combinations of transforms with addititeve animations
export const KEYFRAMES = css`
  /*!
 * animate.css - https://animate.style/
 * Version - 4.1.1
 * Licensed under the Hippocratic License 2.1 - http://firstdonoharm.dev
 *
 * Copyright (c) 2022 Animate.css
 */

  @keyframes bounce {
    0%,
    20%,
    53%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
      transform: translateZ(0);
    }
    40%,
    43% {
      animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);
      transform: translate3d(0, -30px, 0) scaleY(1.1);
    }
    70% {
      animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06);

      transform: translate3d(0, -15px, 0) scaleY(1.05);
    }
    80% {
      transform: translateZ(0) scaleY(0.95);

      transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    90% {
      transform: translate3d(0, -4px, 0) scaleY(1.02);
    }
  }

  @keyframes flash {
    0%,
    50%,
    to {
      opacity: 1;
    }
    25%,
    75% {
      opacity: 0;
    }
  }
  .animate__flash {
    animation-name: flash;
  }

  @keyframes pulse {
    0% {
      transform: scaleX(1);
    }
    50% {
      transform: scale3d(1.05, 1.05, 1.05);
    }
    to {
      transform: scaleX(1);
    }
  }

  @keyframes rubberBand {
    0% {
      transform: scaleX(1);
    }
    30% {
      transform: scale3d(1.25, 0.75, 1);
    }
    40% {
      transform: scale3d(0.75, 1.25, 1);
    }
    50% {
      transform: scale3d(1.15, 0.85, 1);
    }
    65% {
      transform: scale3d(0.95, 1.05, 1);
    }
    75% {
      transform: scale3d(1.05, 0.95, 1);
    }
    to {
      transform: scaleX(1);
    }
  }

  @keyframes shakeX {
    0%,
    to {
      transform: translateZ(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translate3d(-10px, 0, 0);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translate3d(10px, 0, 0);
    }
  }

  @keyframes shakeY {
    0%,
    to {
      transform: translateZ(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translate3d(0, -10px, 0);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translate3d(0, 10px, 0);
    }
  }
  @keyframes headShake {
    0% {
      transform: translateX(0);
    }
    6.5% {
      transform: translateX(-6px) rotateY(-9deg);
    }
    18.5% {
      transform: translateX(5px) rotateY(7deg);
    }
    31.5% {
      transform: translateX(-3px) rotateY(-5deg);
    }
    43.5% {
      transform: translateX(2px) rotateY(3deg);
    }
    50% {
      transform: translateX(0);
    }
  }

  @keyframes swing {
    20% {
      transform: rotate(15deg);
    }
    40% {
      transform: rotate(-10deg);
    }
    60% {
      transform: rotate(5deg);
    }
    80% {
      transform: rotate(-5deg);
    }
    to {
      transform: rotate(0deg);
    }
  }

  @keyframes tada {
    0% {
      transform: scaleX(1);
    }
    10%,
    20% {
      transform: scale3d(0.9, 0.9, 0.9) rotate(-3deg);
    }
    30%,
    50%,
    70%,
    90% {
      transform: scale3d(1.1, 1.1, 1.1) rotate(3deg);
    }
    40%,
    60%,
    80% {
      transform: scale3d(1.1, 1.1, 1.1) rotate(-3deg);
    }
    to {
      transform: scaleX(1);
    }
  }

  @keyframes wobble {
    0% {
      transform: translateZ(0);
    }
    15% {
      transform: translate3d(-25%, 0, 0) rotate(-5deg);
    }
    30% {
      transform: translate3d(20%, 0, 0) rotate(3deg);
    }
    45% {
      transform: translate3d(-15%, 0, 0) rotate(-3deg);
    }
    60% {
      transform: translate3d(10%, 0, 0) rotate(2deg);
    }
    75% {
      transform: translate3d(-5%, 0, 0) rotate(-1deg);
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes jello {
    0%,
    11.1%,
    to {
      transform: translateZ(0);
    }
    22.2% {
      transform: skewX(-12.5deg) skewY(-12.5deg);
    }
    33.3% {
      transform: skewX(6.25deg) skewY(6.25deg);
    }
    44.4% {
      transform: skewX(-3.125deg) skewY(-3.125deg);
    }
    55.5% {
      transform: skewX(1.5625deg) skewY(1.5625deg);
    }
    66.6% {
      transform: skewX(-0.78125deg) skewY(-0.78125deg);
    }
    77.7% {
      transform: skewX(0.390625deg) skewY(0.390625deg);
    }
    88.8% {
      transform: skewX(-0.1953125deg) skewY(-0.1953125deg);
    }
  }

  @keyframes heartBeat {
    0% {
      transform: scale(1);
    }
    14% {
      transform: scale(1.3);
    }
    28% {
      transform: scale(1);
    }
    42% {
      transform: scale(1.3);
    }
    70% {
      transform: scale(1);
    }
  }

  @keyframes backInDown {
    0% {
      opacity: 0.7;

      transform: translateY(-1200px) scale(0.7);
    }
    80% {
      opacity: 0.7;

      transform: translateY(0) scale(0.7);
    }
    to {
      opacity: 1;

      transform: scale(1);
    }
  }

  @keyframes backInLeft {
    0% {
      opacity: 0.7;

      transform: translateX(-2000px) scale(0.7);
    }
    80% {
      opacity: 0.7;

      transform: translateX(0) scale(0.7);
    }
    to {
      opacity: 1;

      transform: scale(1);
    }
  }

  @keyframes backInRight {
    0% {
      opacity: 0.7;

      transform: translateX(2000px) scale(0.7);
    }
    80% {
      opacity: 0.7;

      transform: translateX(0) scale(0.7);
    }
    to {
      opacity: 1;

      transform: scale(1);
    }
  }

  @keyframes backInUp {
    0% {
      opacity: 0.7;

      transform: translateY(1200px) scale(0.7);
    }
    80% {
      opacity: 0.7;

      transform: translateY(0) scale(0.7);
    }
    to {
      opacity: 1;

      transform: scale(1);
    }
  }

  @keyframes backOutDown {
    0% {
      opacity: 1;

      transform: scale(1);
    }
    20% {
      opacity: 0.7;

      transform: translateY(0) scale(0.7);
    }
    to {
      opacity: 0.7;

      transform: translateY(700px) scale(0.7);
    }
  }

  @keyframes backOutLeft {
    0% {
      opacity: 1;

      transform: scale(1);
    }
    20% {
      opacity: 0.7;

      transform: translateX(0) scale(0.7);
    }
    to {
      opacity: 0.7;

      transform: translateX(-2000px) scale(0.7);
    }
  }

  @keyframes backOutRight {
    0% {
      opacity: 1;

      transform: scale(1);
    }
    20% {
      opacity: 0.7;

      transform: translateX(0) scale(0.7);
    }
    to {
      opacity: 0.7;

      transform: translateX(2000px) scale(0.7);
    }
  }

  @keyframes backOutUp {
    0% {
      opacity: 1;

      transform: scale(1);
    }
    20% {
      opacity: 0.7;

      transform: translateY(0) scale(0.7);
    }
    to {
      opacity: 0.7;

      transform: translateY(-700px) scale(0.7);
    }
  }

  @keyframes bounceIn {
    0%,
    20%,
    40%,
    60%,
    80%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    0% {
      opacity: 0;

      transform: scale3d(0.3, 0.3, 0.3);
    }
    20% {
      transform: scale3d(1.1, 1.1, 1.1);
    }
    40% {
      transform: scale3d(0.9, 0.9, 0.9);
    }
    60% {
      opacity: 1;

      transform: scale3d(1.03, 1.03, 1.03);
    }
    80% {
      transform: scale3d(0.97, 0.97, 0.97);
    }
    to {
      opacity: 1;

      transform: scaleX(1);
    }
  }

  @keyframes bounceInDown {
    0%,
    60%,
    75%,
    90%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    0% {
      opacity: 0;

      transform: translate3d(0, -3000px, 0) scaleY(3);
    }
    60% {
      opacity: 1;

      transform: translate3d(0, 25px, 0) scaleY(0.9);
    }
    75% {
      transform: translate3d(0, -10px, 0) scaleY(0.95);
    }
    90% {
      transform: translate3d(0, 5px, 0) scaleY(0.985);
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes bounceInLeft {
    0%,
    60%,
    75%,
    90%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    0% {
      opacity: 0;

      transform: translate3d(-3000px, 0, 0) scaleX(3);
    }
    60% {
      opacity: 1;

      transform: translate3d(25px, 0, 0) scaleX(1);
    }
    75% {
      transform: translate3d(-10px, 0, 0) scaleX(0.98);
    }
    90% {
      transform: translate3d(5px, 0, 0) scaleX(0.995);
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes bounceInRight {
    0%,
    60%,
    75%,
    90%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    0% {
      opacity: 0;

      transform: translate3d(3000px, 0, 0) scaleX(3);
    }
    60% {
      opacity: 1;

      transform: translate3d(-25px, 0, 0) scaleX(1);
    }
    75% {
      transform: translate3d(10px, 0, 0) scaleX(0.98);
    }
    90% {
      transform: translate3d(-5px, 0, 0) scaleX(0.995);
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes bounceInUp {
    0%,
    60%,
    75%,
    90%,
    to {
      animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    0% {
      opacity: 0;

      transform: translate3d(0, 3000px, 0) scaleY(5);
    }
    60% {
      opacity: 1;

      transform: translate3d(0, -20px, 0) scaleY(0.9);
    }
    75% {
      transform: translate3d(0, 10px, 0) scaleY(0.95);
    }
    90% {
      transform: translate3d(0, -5px, 0) scaleY(0.985);
    }
    to {
      transform: translateZ(0);
    }
  }
  @keyframes bounceOut {
    20% {
      transform: scale3d(0.9, 0.9, 0.9);
    }
    50%,
    55% {
      opacity: 1;

      transform: scale3d(1.1, 1.1, 1.1);
    }
    to {
      opacity: 0;

      transform: scale3d(0.3, 0.3, 0.3);
    }
  }

  @keyframes bounceOutDown {
    20% {
      transform: translate3d(0, 10px, 0) scaleY(0.985);
    }
    40%,
    45% {
      opacity: 1;

      transform: translate3d(0, -20px, 0) scaleY(0.9);
    }
    to {
      opacity: 0;

      transform: translate3d(0, 2000px, 0) scaleY(3);
    }
  }

  @keyframes bounceOutLeft {
    20% {
      opacity: 1;

      transform: translate3d(20px, 0, 0) scaleX(0.9);
    }
    to {
      opacity: 0;

      transform: translate3d(-2000px, 0, 0) scaleX(2);
    }
  }

  @keyframes bounceOutRight {
    20% {
      opacity: 1;

      transform: translate3d(-20px, 0, 0) scaleX(0.9);
    }
    to {
      opacity: 0;

      transform: translate3d(2000px, 0, 0) scaleX(2);
    }
  }

  @keyframes bounceOutUp {
    20% {
      transform: translate3d(0, -10px, 0) scaleY(0.985);
    }
    40%,
    45% {
      opacity: 1;

      transform: translate3d(0, 20px, 0) scaleY(0.9);
    }
    to {
      opacity: 0;

      transform: translate3d(0, -2000px, 0) scaleY(3);
    }
  }
  @keyframes fadeIn {
    0% {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes fadeInDown {
    0% {
      opacity: 0;

      transform: translate3d(0, -100%, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }
  @keyframes fadeInDownBig {
    0% {
      opacity: 0;

      transform: translate3d(0, -2000px, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInLeft {
    0% {
      opacity: 0;

      transform: translate3d(-100%, 0, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInLeftBig {
    0% {
      opacity: 0;

      transform: translate3d(-2000px, 0, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInRight {
    0% {
      opacity: 0;

      transform: translate3d(100%, 0, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInRightBig {
    0% {
      opacity: 0;

      transform: translate3d(2000px, 0, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInUp {
    0% {
      opacity: 0;

      transform: translate3d(0, 100%, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInUpBig {
    0% {
      opacity: 0;

      transform: translate3d(0, 2000px, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInTopLeft {
    0% {
      opacity: 0;

      transform: translate3d(-100%, -100%, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInTopRight {
    0% {
      opacity: 0;

      transform: translate3d(100%, -100%, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInBottomLeft {
    0% {
      opacity: 0;

      transform: translate3d(-100%, 100%, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeInBottomRight {
    0% {
      opacity: 0;

      transform: translate3d(100%, 100%, 0);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes fadeOut {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @keyframes fadeOutDown {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(0, 100%, 0);
    }
  }

  @keyframes fadeOutDownBig {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(0, 2000px, 0);
    }
  }

  @keyframes fadeOutLeft {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(-100%, 0, 0);
    }
  }

  @keyframes fadeOutLeftBig {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(-2000px, 0, 0);
    }
  }

  @keyframes fadeOutRight {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(100%, 0, 0);
    }
  }

  @keyframes fadeOutRightBig {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(2000px, 0, 0);
    }
  }

  @keyframes fadeOutUp {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(0, -100%, 0);
    }
  }

  @keyframes fadeOutUpBig {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(0, -2000px, 0);
    }
  }

  @keyframes fadeOutTopLeft {
    0% {
      opacity: 1;

      transform: translateZ(0);
    }
    to {
      opacity: 0;

      transform: translate3d(-100%, -100%, 0);
    }
  }

  @keyframes fadeOutTopRight {
    0% {
      opacity: 1;

      transform: translateZ(0);
    }
    to {
      opacity: 0;

      transform: translate3d(100%, -100%, 0);
    }
  }

  @keyframes fadeOutBottomRight {
    0% {
      opacity: 1;

      transform: translateZ(0);
    }
    to {
      opacity: 0;

      transform: translate3d(100%, 100%, 0);
    }
  }

  @keyframes fadeOutBottomLeft {
    0% {
      opacity: 1;

      transform: translateZ(0);
    }
    to {
      opacity: 0;

      transform: translate3d(-100%, 100%, 0);
    }
  }

  @keyframes flip {
    0% {
      animation-timing-function: ease-out;

      transform: perspective(400px) scaleX(1) translateZ(0) rotateY(-1turn);
    }
    40% {
      animation-timing-function: ease-out;

      transform: perspective(400px) scaleX(1) translateZ(150px) rotateY(-190deg);
    }
    50% {
      animation-timing-function: ease-in;

      transform: perspective(400px) scaleX(1) translateZ(150px) rotateY(-170deg);
    }
    80% {
      animation-timing-function: ease-in;

      transform: perspective(400px) scale3d(0.95, 0.95, 0.95) translateZ(0)
        rotateY(0deg);
    }
    to {
      animation-timing-function: ease-in;

      transform: perspective(400px) scaleX(1) translateZ(0) rotateY(0deg);
    }
  }

  @keyframes flipInX {
    0% {
      animation-timing-function: ease-in;
      opacity: 0;

      transform: perspective(400px) rotateX(90deg);
    }
    40% {
      animation-timing-function: ease-in;

      transform: perspective(400px) rotateX(-20deg);
    }
    60% {
      opacity: 1;

      transform: perspective(400px) rotateX(10deg);
    }
    80% {
      transform: perspective(400px) rotateX(-5deg);
    }
    to {
      transform: perspective(400px);
    }
  }

  @keyframes flipInY {
    0% {
      animation-timing-function: ease-in;
      opacity: 0;

      transform: perspective(400px) rotateY(90deg);
    }
    40% {
      animation-timing-function: ease-in;

      transform: perspective(400px) rotateY(-20deg);
    }
    60% {
      opacity: 1;

      transform: perspective(400px) rotateY(10deg);
    }
    80% {
      transform: perspective(400px) rotateY(-5deg);
    }
    to {
      transform: perspective(400px);
    }
  }

  @keyframes flipOutX {
    0% {
      transform: perspective(400px);
    }
    30% {
      opacity: 1;

      transform: perspective(400px) rotateX(-20deg);
    }
    to {
      opacity: 0;

      transform: perspective(400px) rotateX(90deg);
    }
  }

  @keyframes flipOutY {
    0% {
      transform: perspective(400px);
    }
    30% {
      opacity: 1;

      transform: perspective(400px) rotateY(-15deg);
    }
    to {
      opacity: 0;

      transform: perspective(400px) rotateY(90deg);
    }
  }

  @keyframes lightSpeedInRight {
    0% {
      opacity: 0;

      transform: translate3d(100%, 0, 0) skewX(-30deg);
    }
    60% {
      opacity: 1;

      transform: skewX(20deg);
    }
    80% {
      transform: skewX(-5deg);
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes lightSpeedInLeft {
    0% {
      opacity: 0;

      transform: translate3d(-100%, 0, 0) skewX(30deg);
    }
    60% {
      opacity: 1;

      transform: skewX(-20deg);
    }
    80% {
      transform: skewX(5deg);
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes lightSpeedOutRight {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(100%, 0, 0) skewX(30deg);
    }
  }

  @keyframes lightSpeedOutLeft {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(-100%, 0, 0) skewX(-30deg);
    }
  }

  @keyframes rotateIn {
    0% {
      opacity: 0;

      transform: rotate(-200deg);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes rotateInDownLeft {
    0% {
      opacity: 0;

      transform: rotate(-45deg);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes rotateInDownRight {
    0% {
      opacity: 0;

      transform: rotate(45deg);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes rotateInUpLeft {
    0% {
      opacity: 0;

      transform: rotate(45deg);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes rotateInUpRight {
    0% {
      opacity: 0;

      transform: rotate(-90deg);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes rotateOut {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: rotate(200deg);
    }
  }

  @keyframes rotateOutDownLeft {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: rotate(45deg);
    }
  }

  @keyframes rotateOutDownRight {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: rotate(-45deg);
    }
  }

  @keyframes rotateOutUpLeft {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: rotate(-45deg);
    }
  }

  @keyframes rotateOutUpRight {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: rotate(90deg);
    }
  }

  @keyframes hinge {
    0% {
      animation-timing-function: ease-in-out;
    }
    20%,
    60% {
      animation-timing-function: ease-in-out;

      transform: rotate(80deg);
    }
    40%,
    80% {
      animation-timing-function: ease-in-out;
      opacity: 1;

      transform: rotate(60deg);
    }
    to {
      opacity: 0;

      transform: translate3d(0, 700px, 0);
    }
  }

  @keyframes jackInTheBox {
    0% {
      opacity: 0;

      transform: scale(0.1) rotate(30deg);

      transform-origin: center bottom;
    }
    50% {
      transform: rotate(-10deg);
    }
    70% {
      transform: rotate(3deg);
    }
    to {
      opacity: 1;

      transform: scale(1);
    }
  }

  @keyframes rollIn {
    0% {
      opacity: 0;

      transform: translate3d(-100%, 0, 0) rotate(-120deg);
    }
    to {
      opacity: 1;

      transform: translateZ(0);
    }
  }

  @keyframes rollOut {
    0% {
      opacity: 1;
    }
    to {
      opacity: 0;

      transform: translate3d(100%, 0, 0) rotate(120deg);
    }
  }

  @keyframes zoomIn {
    0% {
      opacity: 0;

      transform: scale3d(0.3, 0.3, 0.3);
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes zoomInDown {
    0% {
      animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      opacity: 0;

      transform: scale3d(0.1, 0.1, 0.1) translate3d(0, -1000px, 0);
    }
    60% {
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1);
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(0, 60px, 0);
    }
  }

  @keyframes zoomInLeft {
    0% {
      animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      opacity: 0;

      transform: scale3d(0.1, 0.1, 0.1) translate3d(-1000px, 0, 0);
    }
    60% {
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1);
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(10px, 0, 0);
    }
  }

  @keyframes zoomInRight {
    0% {
      animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      opacity: 0;

      transform: scale3d(0.1, 0.1, 0.1) translate3d(1000px, 0, 0);
    }
    60% {
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1);
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(-10px, 0, 0);
    }
  }

  @keyframes zoomInUp {
    0% {
      animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      opacity: 0;

      transform: scale3d(0.1, 0.1, 0.1) translate3d(0, 1000px, 0);
    }
    60% {
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1);
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(0, -60px, 0);
    }
  }

  @keyframes zoomOut {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;

      transform: scale3d(0.3, 0.3, 0.3);
    }
    to {
      opacity: 0;
    }
  }

  @keyframes zoomOutDown {
    40% {
      animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(0, -60px, 0);
    }
    to {
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1);
      opacity: 0;

      transform: scale3d(0.1, 0.1, 0.1) translate3d(0, 2000px, 0);
    }
  }

  @keyframes zoomOutLeft {
    40% {
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(42px, 0, 0);
    }
    to {
      opacity: 0;

      transform: scale(0.1) translate3d(-2000px, 0, 0);
    }
  }

  @keyframes zoomOutRight {
    40% {
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(-42px, 0, 0);
    }
    to {
      opacity: 0;

      transform: scale(0.1) translate3d(2000px, 0, 0);
    }
  }

  @keyframes zoomOutUp {
    40% {
      animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      opacity: 1;

      transform: scale3d(0.475, 0.475, 0.475) translate3d(0, 60px, 0);
    }
    to {
      animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1);
      opacity: 0;

      transform: scale3d(0.1, 0.1, 0.1) translate3d(0, -2000px, 0);
    }
  }

  @keyframes slideInDown {
    0% {
      transform: translate3d(0, -100%, 0);
      visibility: visible;
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes slideInLeft {
    0% {
      transform: translate3d(-100%, 0, 0);
      visibility: visible;
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes slideInRight {
    0% {
      transform: translate3d(100%, 0, 0);
      visibility: visible;
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes slideInUp {
    0% {
      transform: translate3d(0, 100%, 0);
      visibility: visible;
    }
    to {
      transform: translateZ(0);
    }
  }

  @keyframes slideOutDown {
    0% {
      transform: translateZ(0);
    }
    to {
      transform: translate3d(0, 100%, 0);
      visibility: hidden;
    }
  }

  @keyframes slideOutLeft {
    0% {
      transform: translateZ(0);
    }
    to {
      transform: translate3d(-100%, 0, 0);
      visibility: hidden;
    }
  }

  @keyframes slideOutRight {
    0% {
      transform: translateZ(0);
    }
    to {
      transform: translate3d(100%, 0, 0);
      visibility: hidden;
    }
  }

  @keyframes slideOutUp {
    0% {
      transform: translateZ(0);
    }
    to {
      transform: translate3d(0, -100%, 0);
      visibility: hidden;
    }
  }
`;

export const ANIMATION_NAMES = [
  "bounce",
  "flash",
  "pulse",
  "rubberBand",
  "shake",
  "headShake",
  "swing",
  "tada",
  "wobble",
  "jello",
  "heartBeat",
  "backInDown",
  "backInLeft",
  "backInRight",
  "backInUp",
  "backOutDown",
  "backOutLeft",
  "backOutRight",
  "backOutUp",
  "bounceIn",
  "bounceInDown",
  "bounceInLeft",
  "bounceInRight",
  "bounceInUp",
  "bounceOut",
  "bounceOutDown",
  "bounceOutLeft",
  "bounceOutRight",
  "bounceOutUp",
  "fadeIn",
  "fadeInDown",
  "fadeInDownBig",
  "fadeInLeft",
  "fadeInLeftBig",
  "fadeInRight",
  "fadeInRightBig",
  "fadeInUp",
  "fadeInUpBig",
  "fadeInTopLeft",
  "fadeInTopRight",
  "fadeInBottomLeft",
  "fadeInBottomRight",
  "fadeOut",
  "fadeOutDown",
  "fadeOutDownBig",
  "fadeOutLeft",
  "fadeOutLeftBig",
  "fadeOutRight",
  "fadeOutRightBig",
  "fadeOutUp",
  "fadeOutUpBig",
  "fadeOutTopLeft",
  "fadeOutTopRight",
  "fadeOutBottomRight",
  "fadeOutBottomLeft",
  "flip",
  "flipInX",
  "flipInY",
  "flipOutX",
  "flipOutY",
  "lightSpeedInRight",
  "lightSpeedInLeft",
  "lightSpeedOutRight",
  "lightSpeedOutLeft",
  "rotateIn",
  "rotateInDownLeft",
  "rotateInDownRight",
  "rotateInUpLeft",
  "rotateInUpRight",
  "rotateOut",
  "rotateOutDownLeft",
  "rotateOutDownRight",
  "rotateOutUpLeft",
  "rotateOutUpRight",
  "hinge",
  "jackInTheBox",
  "rollIn",
  "rollOut",
  "zoomIn",
  "zoomInDown",
  "zoomInLeft",
  "zoomInRight",
  "zoomInUp",
  "zoomOut",
  "zoomOutDown",
  "zoomOutLeft",
  "zoomOutRight",
  "zoomOutUp",
  "slideInDown",
  "slideInLeft",
  "slideInRight",
  "slideInUp",
  "slideOutDown",
  "slideOutLeft",
  "slideOutRight",
  "slideOutUp",
];
