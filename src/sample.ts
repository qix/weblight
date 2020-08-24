export const SAMPLE = `
unsigned int state_loop = 0;
unsigned int state_incr = 1;
unsigned int state = 0;
int fade_speed = 16;
void rope_fade(int amount)
{
  for (int k = 0; k < ROPE_TOTAL * 3; k++)
  {
    ledBuffer[k] = ledBuffer[k] > amount ? ledBuffer[k] - amount : 0;
  }
}

enum MODE
{
  MODE_SET = 0,
  MODE_ADD = 1,
  MODE_BLEND = 2,
};

uint8_t blend(float amount, int a, int b)
{
  float af = a / 255.0;
  float bf = b / 255.0;
  return (uint8_t)(255 * sqrt((1 - amount) * af * af + amount * bf * bf));
}

void rgb(int pixel, uint8_t r, uint8_t g, uint8_t b, int mode = MODE_SET)
{
  int position = (ROPE_START + pixel) * 3;
  if (mode == MODE_SET)
  {
    ledBuffer[position + 1] = r;
    ledBuffer[position + 0] = g;
    ledBuffer[position + 2] = b;
  }
  else if (mode == MODE_ADD)
  {
    ledBuffer[position + 1] = min(255, ((int)r) + ledBuffer[position + 1]);
    ledBuffer[position + 0] = min(255, ((int)g) + ledBuffer[position + 0]);
    ledBuffer[position + 2] = min(255, ((int)b) + ledBuffer[position + 2]);
  }
  else if (mode == MODE_BLEND)
  {
    ledBuffer[position + 1] = blend(0.5, ledBuffer[position + 1], r);
    ledBuffer[position + 0] = blend(0.5, ledBuffer[position + 0], g);
    ledBuffer[position + 2] = blend(0.5, ledBuffer[position + 2], b);
  }
}

void hsv(int pixel, int hue, uint8_t sat, uint8_t val, int mode = MODE_SET)
{
  val = gamma8[(uint8_t)val];
  sat = 255 - gamma8[255 - (uint8_t)sat];

  int base;

  if (sat == 0)
  { // Acromatic color (gray). Hue doesn't mind.
    rgb(pixel, val, val, val, mode);
  }
  else
  {
    base = (int)(((255 - sat) * val) >> 8);

    switch ((int)(hue / 60))
    {
    case 0:
      return rgb(pixel, val, (((val - base) * hue) / 60) + base, base, mode);
    case 1:
      return rgb(pixel, (((val - base) * (60 - (hue % 60))) / 60) + base, val, base, mode);
    case 2:
      return rgb(pixel, base, val, (((val - base) * (hue % 60)) / 60) + base, mode);
    case 3:
      return rgb(pixel, base, (((val - base) * (60 - (hue % 60))) / 60) + base, val, mode);
    case 4:
      return rgb(pixel, (((val - base) * (hue % 60)) / 60) + base, base, val, mode);
    case 5:
      return rgb(pixel, val, base, (((val - base) * (60 - (hue % 60))) / 60) + base, mode);
    }
  }
}

void rope_rgb(uint8_t r, uint8_t g, uint8_t b)
{
  for (int k = 0; k < ROPE_LEDS; k++)
  {
    rgb(k, r, g, b);
  }
}

void rope_hsv(int hue, uint8_t sat, uint8_t val)
{
  for (int k = 0; k < ROPE_LEDS; k++)
  {
    hsv(k, hue, sat, val);
  }
}

void copy(uint8_t *source, int from_offset, int to_offset, int pixels)
{
  memcpy(ledBuffer + (ROPE_START + to_offset) * 3, source + (from_offset * 3), pixels * 3);
}
void erase(int offset, int pixels)
{
  memset(ledBuffer + (ROPE_START + offset) * 3, 0, pixels * 3);
}

void led_positions(void)
{
  for (int k = 0; k < ROPE_LEDS; k++)
  {
    if (k % 25 == 0)
    {
      rgb(k, 255, 255, 255);
    }
    else if (k % 10 == 0)
    {
      rgb(k, 255, 0, 0);
    }
    else if (k % 5 == 0)
    {
      rgb(k, 0, 255, 0);
    }
    else if (k % 2 == 0)
    {
      rgb(k, 0, 0, 255);
    }
  }
}

struct ChasePoint
{
  int pos;
  int hue;
  int len;
  int speed;
  int hue_v;
  int bright;
  bool wrap;
};

enum ChaseMode
{
  CHASE = 0,
  FLOWER = 1,
  RAINBOW = 2,
  SPARKLE = 3,
  PULSE = 4,
  NOISE = 5,
  NUM_CHASE_MODES = 6,

  FLASH = 64,

  OFF = 255,
};

enum ColorMode
{
  HSV = 1,
  RGB = 2,
};

#define CHASE_POINTS 8
#define POS_SCALE 10
ChasePoint points[CHASE_POINTS];
ChaseMode chase_mode;
int last_auto = 0;

int r_mult = 255;
int g_mult = 255;
int b_mult = 255;
ColorMode color_mode = HSV;

void mult_rgb(int r, int g, int b)
{
  r_mult = r;
  g_mult = g;
  b_mult = b;
}

void switch_light(bool on)
{
  if (on)
  {
    digitalWrite(RELAY_PIN, LOW);
  }
  else
  {
    digitalWrite(RELAY_PIN, HIGH);
  }
}

void chase_setup(ChaseMode mode);
void message(char *message)
{
  if (strcmp(message, "LIGHT") == 0)
  {
    switch_light(true);
  }
  else if (strcmp(message, "ON") == 0)
  {
    switch_light(true);
    chase_setup(CHASE);
    last_auto = millis();
  }
  else if (strcmp(message, "CHASE") == 0)
  {
    chase_setup(CHASE);
  }
  else if (strcmp(message, "FLOWER") == 0)
  {
    chase_setup(FLOWER);
  }
  else if (strcmp(message, "GREEN") == 0)
  {
    mult_rgb(0, 255, 0);
  }
  else if (strcmp(message, "PULSE") == 0)
  {
    chase_setup(PULSE);
  }
  else if (strcmp(message, "SPARKLE") == 0)
  {
    chase_setup(SPARKLE);
  }
  else if (strcmp(message, "NOISE") == 0)
  {
    chase_setup(NOISE);
  }
  else if (strcmp(message, "FLASH") == 0)
  {
    chase_setup(FLASH);
  }
  else if (strcmp(message, "RED") == 0)
  {
    mult_rgb(255, 0, 0);
  }
  else if (strcmp(message, "GREEN") == 0)
  {
    mult_rgb(0, 255, 0);
  }
  else if (strcmp(message, "BLUE") == 0)
  {
    mult_rgb(0, 0, 255);
  }
  else if (strcmp(message, "YELLOW") == 0)
  {
    mult_rgb(255, 255, 0);
  }
  else if (strcmp(message, "TURQUOISE") == 0)
  {
    mult_rgb(0, 255, 255);
  }
  else if (strcmp(message, "PINK") == 0)
  {
    mult_rgb(255, 0, 255);
  }
  else if (strcmp(message, "RAINBOW") == 0)
  {
    chase_setup(RAINBOW);
  }
  else if (strcmp(message, "RANDOM") == 0)
  {
    int next = random(NUM_CHASE_MODES);
    while (next == chase_mode)
    {
      next = random(NUM_CHASE_MODES);
    }
    chase_setup(next);
  }
  else if (strcmp(message, "NEXT") == 0)
  {
    chase_setup((chase_mode + 1) % NUM_CHASE_MODES);
  }
  else if (strcmp(message, "OFF") == 0)
  {
    switch_light(false);
    chase_setup(OFF);
  }
  else if (strcmp(message, "AUTO") == 0)
  {
    if (chase_mode >= NUM_CHASE_MODES)
    {
      chase_setup(random(NUM_CHASE_MODES));
    }
    last_auto = millis() + 1;
  }
}

void chase_setup(ChaseMode mode = OFF)
{
  rope_clear();
  chase_mode = mode;

  color_mode = HSV;
  last_auto = 0;
  fade_speed = 16;
  state = 0;
  state_loop = 0;
  state_incr = 1;
  for (int k = 0; k < CHASE_POINTS; k++)
  {
    points[k].len = 0;
  }

  if (mode == OFF)
  {
    fade_speed = 256;
  }
  else if (mode == CHASE)
  {
    for (int k = 0; k < CHASE_POINTS; k++)
    {
      points[k].pos = random(POS_SCALE * ROPE_LEDS);
      points[k].hue = random(360);
      points[k].len = 8;
      points[k].speed = k == 0 ? -1 : k;
      points[k].hue_v = 1;
      points[k].bright = 255;
      points[k].wrap = true;
    }
    fade_speed = 64;
  }
  else if (mode == FLOWER)
  {
    fade_speed = 2;
    for (int k = 0; k < 2; k++)
    {
      points[k].pos = 0;
      points[k].hue = 0;
      points[k].len = 50;
      points[k].speed = k == 0 ? -5 : +5;
      points[k].hue_v = 0;
      points[k].bright = 64;
      points[k].wrap = false;
    }
    fade_speed = 8;
    color_mode = RGB;
    mult_rgb(255, 0, 0);
  }
  else if (mode == FLASH)
  {
    state_loop = 256;
    state_incr = 5;

    // can't handle all the lights being white, need more power
    mult_rgb(50, 50, 50);
  }
  else if (mode == PULSE)
  {
    state_loop = 512;
  }
  else if (mode == RAINBOW)
  {
    state_loop = 360;
  }
  else if (mode == NOISE)
  {
    // no setup
  }
  else if (mode == SPARKLE)
  {
    fade_speed = 1;
  }
}

void chase_reset(void)
{
  if (chase_mode == FLASH)
  {
    chase_setup(OFF);
  }
}

void point_render(int k)
{
  int hue = points[k].hue;
  int highlight = (int)(points[k].pos / POS_SCALE);
  int length = points[k].len;

  if (!points[k].wrap)
  {
    if (points[k].speed >= 0)
    {
      length = min(length, highlight);
    }
    else
    {
      length = min(length, ROPE_LEDS - highlight);
    }
  }

  if (color_mode == HSV)
  {
    for (int tail = 0; tail < length; tail++)
    {
      hsv(
          (highlight - (points[k].speed >= 0 ? tail : -tail) + ROPE_LEDS) % ROPE_LEDS,
          points[k].hue, 255, (points[k].bright * (length - tail)) / length,
          MODE_ADD);
    }
  }
  else if (color_mode == RGB)
  {
    for (int tail = 0; tail < length; tail++)
    {
      int bright = (points[k].bright * (length - tail)) / length;
      rgb(
          (highlight - (points[k].speed >= 0 ? tail : -tail) + ROPE_LEDS) % ROPE_LEDS,
          min(r_mult, bright), min(g_mult, bright), min(b_mult, bright),
          MODE_ADD);
    }
  }
  else
  {
    Serial.println("Unknown color_mode");
  }
}

int distance(int k, int j)
{
  int d = abs(k - j);
  return min(d, ROPE_LEDS - d);
}

void chase(void)
{
  if (last_auto > 0)
  {
    if (millis() - last_auto > 5000)
    {
      chase_setup((chase_mode + 1) % NUM_CHASE_MODES);
      last_auto = millis();
    }
  }

  if (chase_mode == PULSE)
  {
    int pulse = 0;
    if (state < 256)
    {
      pulse = state % 256;
    }
    else
    {
      pulse = 255 - (state - 256) % 256;
    }

    rope_rgb(min(32 + pulse, 255), 0, 0);
  }
  else if (chase_mode == SPARKLE)
  {
    if (state % 5 == 0)
    {
      hsv(random(ROPE_LEDS), random(360), 255, random(96, 256), MODE_ADD);
    }
    if (state % 2 == 0)
    {
      rope_fade(1);
    }
    delay(10);
  }
  else if (chase_mode == NOISE)
  {
    for (int i = 0; i < ROPE_LEDS; i++)
    {
      uint8_t value = gamma8_floor[random(256)];
      rgb(i, value, value, value);
    }
  }
  else if (chase_mode == FLASH)
  {
    int partial = 0;
    int bright = min(255, 2 * (state > 128 ? 255 - state : state));

    for (int i = 0; i < ROPE_LEDS; i++)
    {
      uint8_t value = gamma8_floor[bright];

      partial = gamma8_partial[bright];
      if (partial >= 128 && i % 2 == 0)
      {
        value += 1;
      }
      else if (partial >= 64 && i % 4 == 0)
      {
        value += 1;
      }
      else if (partial >= 32 && i % 8 == 0)
      {
        value += 1;
      }
      else if (partial >= 16 && i % 16 == 0)
      {
        value += 1;
      }
      /*
      partial += gamma8_partial[bright];
      if (partial >= 256) {
        partial -= 256;
        value += 1;
      }*/

      rgb(i, min(r_mult, value), min(g_mult, value), min(b_mult, value));
    }
    return;

    if (state < 11)
    {
      for (int center = 10; center < ROPE_LEDS - 10; center += 20)
      {
        for (int k = 0; k <= 10; k++)
        {
          rgb(center + k, k < state ? 255 : 0, 0, 0);
          rgb(center - k, k < state ? 255 : 0, 0, 0);
        }
      }
    }
    else if (state > 12)
    {
      int bright = 256 - (state - 12); // * 16;
      if (bright == 0)
      {
        chase_setup(OFF);
        return;
      }
      rope_rgb(gamma8[bright], 0, 0);
    }
    delay(50);
  }
  else if (chase_mode == RAINBOW)
  {
    points[0].pos = (points[0].pos + 1) % ROPE_LEDS;
    int dark = points[0].pos;

    for (int k = 0; k < ROPE_LEDS; k++)
    {
      int dist = distance(k, dark);
      hsv(k, (state + k) % 360, 255, dist < 25 ? 255 - 10 * (25 - dist) : 255);
    }
    delay(50);
  }
  else
  {
    rope_fade(fade_speed);
  }

  for (int k = 0; k < 8; k++)
  {
    if (points[k].len == 0)
    {
      continue;
    }

    point_render(k);

    // area slowdown
    int pos = points[k].pos / POS_SCALE;
    if (state % 3 == 0 && pos >= 200 && pos <= 250)
    {
      // skip movement
    }
    else
    {
      points[k].pos = (points[k].pos + points[k].speed + ROPE_LEDS * POS_SCALE) % (ROPE_LEDS * POS_SCALE);
    }
    points[k].hue = (points[k].hue + points[k].hue_v + 360) % 360;
  }
}

void step(void)
{
  chase();
  state += state_incr;
  if (state_loop && state >= state_loop)
  {
    state = 0;
    chase_reset();
  }
}
void join(void)
{
  int half = ROPE_LEDS / 2;
  for (int k = 0; k < half; k++)
  {
    hsv(k, (state + k) % 360, 255, k < (state % half) ? 255 : 0);
    hsv(ROPE_LEDS - k - 1, (state + k) % 360, 255, k < (state % half) ? 255 : 0);
  }
}`;
