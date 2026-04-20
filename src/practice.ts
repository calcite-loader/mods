/**
 * @name Practice Mode
 */

interface Checkpoint {
  x: number;
  y: number;
  flying: boolean;
  yVel: number;
  jumping: boolean;
  rotation: number;
  songPosition: number;
  sprite: Phaser.GameObjects.Image;
}
const checkpoints: Checkpoint[] = [];

const checkpointImage =
  "data:image/webp;base64,UklGRgYCAABXRUJQVlA4TPkBAAAvQ0AfEIWEAI4EKYoDJCAFKUhBClKQggQkNPzPTicVAwYiyVgNRBBNFFFEE0EEA5FkrAYiiCaKKKKJIAJDyLaFXIMQPkIID+EhfJQQQvgoDyWEEJZx2zaS7Ae3gbm3ApG0osQRI0a8IuWKEv5XnHLEKxztfopL/MJZsZoRjyAIr3iDIAjitP3EFw7KDgYHZQeDk7IPyj6peqHqjaJXit6puVBzo+RKyZ2KBj3n352Ws2tm3Gk5VSbTQsmJMBEWSv5lo+RKyZ2KBhUNRBV0EFNw4xsHuDvv+A+uC6wNrA9qAGoCaARoBmYIZgpkDGQOIgAiASACIEMsRCxFKEYoRyRIJEkgSiCKuAtaq35FZ/thimPKY1nAsoFhBcMK4hK92UG02IIgvOGRmUFmul0HmthiCYIgfOFxqphMYObOdZyJJSLmTkcxIiKiFji3eWeD9gPntLPD+oMXCIIg+hio4rvDKz6RI2Iv4IotIuJQ0IPXA9eF1gXWh9UHNYE0ATSDMwMzhTIFMocxB5GAkACQIZchliKVIpQjkyOSJJEkkMWXxdjnHAIRvWDtc0SLEBVzx9tuIRG14G23eCwbODYw7LDbYbXEaonNFps8lg0cGxh22O2w2mKzxWKPuz2uNrnZ5GKXp10O678mPCxzWI1Yz18TuhUt5l/jVVkEAA==";

api.onLoad(() => {
  window.gdScene.textures.addBase64("checkpoint", checkpointImage);
});

api.onStart(() => {
  const zKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.Z,
  );
  const xKey = window.gdScene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.X,
  );

  zKey.on("down", () => {
    checkpoints.push({
      x: window.gdScene._playerWorldX,
      y: window.gdScene._state.y,
      flying: window.gdScene._state.isFlying,
      yVel: window.gdScene._state.yVelocity,
      jumping: window.gdScene._state.isJumping,
      rotation: window.gdScene._player._rotation,
      songPosition: window.gdScene._audio._music
        ? (window.gdScene._audio._music as Phaser.Sound.WebAudioSound).seek
        : 0,
      sprite: window.gdScene.add.image(0, 0, "checkpoint").setScale(0.5)
        .setDepth(20),
    });
  });
  xKey.on("down", () => {
    if (checkpoints.length == 0) return;
    checkpoints.at(-1)!.sprite.destroy();
    checkpoints.pop();
  });

  const originalRestartLevel = window.gdScene._restartLevel.bind(
    window.gdScene,
  );
  window.gdScene._restartLevel = (function (this: typeof window.gdScene) {
    const fromDeath = window.gdScene._deathTimer > 0;

    originalRestartLevel();

    if (!fromDeath) { // from pause menu, clear checkpoints
      for (const checkpoint of checkpoints) {
        checkpoint.sprite.destroy();
      }
      checkpoints.length = 0;
      return;
    }

    if (checkpoints.length > 0) {
      window.gdScene._playerWorldX = checkpoints.at(-1)!.x;
      window.gdScene._state.y = checkpoints.at(-1)!.y;
      window.gdScene._state.yVelocity = checkpoints.at(-1)!.yVel;
      window.gdScene._state.isJumping = checkpoints.at(-1)!.jumping;
      window.gdScene._player._rotation = checkpoints.at(-1)!.rotation;
      if (checkpoints.at(-1)!.flying) {
        window.gdScene._player.enterShipMode();
      }
      if (window.gdScene._audio._music) {
        (window.gdScene._audio._music as Phaser.Sound.WebAudioSound).seek =
          checkpoints.at(-1)!.songPosition;
      }
    }
  }).bind(window.gdScene);
});

api.onUpdate(() => {
  for (const checkpoint of checkpoints) {
    checkpoint.sprite.x = checkpoint.x - window.gdScene._cameraX;
    checkpoint.sprite.y = 460 - (checkpoint.y - window.gdScene._cameraY);
  }
});
