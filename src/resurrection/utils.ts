export const jumpForce = 22.360064;

export const flipGravity = (flipped: boolean, yMul: number = 0.5) => {
  if (window.gdScene._state.gravityFlipped === flipped) return;
  window.gdScene._state.gravityFlipped = flipped;
  window.gdScene._state.yVelocity *= yMul;
  window.gdScene._state.canJump = false;
  window.gdScene._state.onGround = false;
};
