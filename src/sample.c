/**
 * 'weblight': Online program editor for some LED wall art I've been working on.
 *
 * === Lights ===
 * 
 * Lights are a WS2812B LED strip. The code that controls the lights is listed (and editable!) below.
 * For a more simple example, swap out the call to 'render_display()' with render_join_halves()' at the
 * bottom.
 * 
 * There is an video of the light in action: https://www.instagram.com/p/CEUXn-MJYs_/
 *
 * === Messages ===
 * 
 * The controller supports basic messages sent over WiFi. Try typing 'RAINBOW' in the text box on the
 * right. The message() function will be called with the individual words.
 *
 * === Editor ===
 * The editor is using a simple transpiler to convert the C code below into JavaScript compatible
 * code. The compiler and main loop runs in a web worker, sending over the LED data.
 *
 * Source: https://github.com/qix/weblight
 *
 * === Saving ===
 * 
 * Not implemented yet. I could probably get this working inside JSFiddle but I'm not sure I could
 * get the experience to be as good.
 * 
 * I'm open to pull requests of https://github.com/qix/weblight/blob/master/src/sample.c though :)
 * 
 */

// Maximum supported number of points
#define MAX_PARTICLES 32
// Scale to calculate position using (allows particles to be midway between positions)
#define POS_SCALE 10
// Maximum position for any particle
#define POS_MAX (ROPE_LEDS * POS_SCALE)

enum BlendMode
{
    COLOR_SET = 0,
    COLOR_ADD = 1,
    COLOR_BLEND = 2,
};

enum CollisionMode
{
    COLLIDE_OFF = 0,
    COLLIDE_BOOM = 1,
};

enum DisplayMode
{
    CHASE = 0,
    FLOWER = 1,
    RAINBOW = 2,
    SPARKLE = 3,
    PULSE = 4,
    NOISE = 5,
    RANDCHASE = 6,
    NUM_DISPLAY_MODES = 7,

    FLASH = 64,

    OFF = 255,
};

enum ColorMode
{
    HSV = 1,
    RGB = 2,
};

struct ChasePoint
{
    int age;
    int pos;
    int hue;
    int len;
    int speed;
    int hue_v;
    int bright;
    int respawn;
    bool wrap;
};

ChasePoint particles[MAX_PARTICLES];
DisplayMode display_mode;
int last_auto = 0;

int r_mult = 255;
int g_mult = 255;
int b_mult = 255;

// These are all configured during display_setup()
ColorMode color_mode = HSV;
CollisionMode collision_mode = COLLIDE_OFF;
bool collide_same_direction = false;

unsigned int state_loop = 0;
unsigned int state;
int fade_speed = 16;
int rope_offset = 0;

#define FLASH_STEP 10

/**********************************************
 * Color rendering logic
 **********************************************/
uint8_t blend(float amount, int a, int b)
{
    float af = a / 255.0;
    float bf = b / 255.0;
    return (uint8_t)(255 * sqrt((1 - amount) * af * af + amount * bf * bf));
}

void rgb(int pixel, uint8_t r, uint8_t g, uint8_t b, int mode = COLOR_SET)
{
    int position = (rope_offset + pixel) * 3;
    if (mode == COLOR_SET)
    {
        ledBuffer[position + 1] = r;
        ledBuffer[position + 0] = g;
        ledBuffer[position + 2] = b;
        return;
    }

    uint8_t oR = ledBuffer[position + 1];
    uint8_t oG = ledBuffer[position + 0];
    uint8_t oB = ledBuffer[position + 2];

    if (mode == COLOR_ADD)
    {
        int maxPrev = max(oR, max(oG, oB));
        uint8_t maxNow = max(r, max(g, b));

        if (maxNow + maxPrev > 255)
        {
            float scale = ((255.0 - maxNow) / 255);
            oR = (uint8_t)(oR * scale);
            oG = (uint8_t)(oG * scale);
            oB = (uint8_t)(oB * scale);
        }
        r = (uint8_t)(r + oR);
        g = (uint8_t)(g + oG);
        b = (uint8_t)(b + oB);
    }
    else if (mode == COLOR_BLEND)
    {
        r = blend(0.5, oR, r);
        g = blend(0.5, oG, g);
        b = blend(0.5, oB, b);
    }

    ledBuffer[position + 1] = r;
    ledBuffer[position + 0] = g;
    ledBuffer[position + 2] = b;
}

void hsv(int pixel, int hue, uint8_t sat, uint8_t val, int mode = COLOR_SET)
{
    val = gamma8[(uint8_t)val];
    sat = 255 - gamma8[255 - (uint8_t)sat];

    int base;

    if (sat == 0)
    {
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

void rope_fade(int amount)
{
    for (int k = 0; k < ROPE_LEDS * 3; k++)
    {
        ledBuffer[k] = ledBuffer[k] > amount ? ledBuffer[k] - amount : 0;
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

void mult_rgb(int r, int g, int b)
{
    r_mult = r;
    g_mult = g;
    b_mult = b;
}

/**********************************************
 * Setup
 **********************************************/

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

void display_setup(DisplayMode mode);
void message(char *message)
{
    if (strcmp(message, "LIGHT") == 0)
    {
        switch_light(true);
    }
    else if (strcmp(message, "ON") == 0)
    {
        switch_light(true);
        display_setup(CHASE);
        last_auto = millis();
    }
    else if (strcmp(message, "CHASE") == 0)
    {
        display_setup(CHASE);
    }
    else if (strcmp(message, "RANDCHASE") == 0)
    {
        display_setup(RANDCHASE);
    }
    else if (strcmp(message, "FLOWER") == 0)
    {
        display_setup(FLOWER);
    }
    else if (strcmp(message, "GREEN") == 0)
    {
        mult_rgb(0, 255, 0);
    }
    else if (strcmp(message, "PULSE") == 0)
    {
        display_setup(PULSE);
    }
    else if (strcmp(message, "SPARKLE") == 0)
    {
        display_setup(SPARKLE);
    }
    else if (strcmp(message, "NOISE") == 0)
    {
        display_setup(NOISE);
    }
    else if (strcmp(message, "FLASH") == 0)
    {
        display_setup(FLASH);
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
        display_setup(RAINBOW);
    }
    else if (strcmp(message, "RANDOM") == 0)
    {
        int next = random(NUM_DISPLAY_MODES);
        while (next == display_mode)
        {
            next = random(NUM_DISPLAY_MODES);
        }
        display_setup(next);
    }
    else if (strcmp(message, "NEXT") == 0)
    {
        display_setup((display_mode + 1) % NUM_DISPLAY_MODES);
    }
    else if (strcmp(message, "OFF") == 0)
    {
        switch_light(false);
        display_setup(OFF);
    }
    else if (strcmp(message, "AUTO") == 0)
    {
        if (display_mode >= NUM_DISPLAY_MODES)
        {
            display_setup(random(NUM_DISPLAY_MODES));
        }
        last_auto = millis() + 1;
    }
}

void display_setup(DisplayMode mode)
{
    rope_clear();
    display_mode = mode;

    color_mode = HSV;
    last_auto = 0;
    fade_speed = 16;
    state = 0;
    state_loop = 0;
    collision_mode = COLLIDE_OFF;
    collide_same_direction = false;
    for (int k = 0; k < MAX_PARTICLES; k++)
    {
        particles[k].age = 0;
        particles[k].len = 0;
        particles[k].respawn = 0;
    }

    if (mode == OFF)
    {
        fade_speed = 256;
    }
    else if (mode == CHASE)
    {
        for (int k = 0; k < 8; k++)
        {
            particles[k].pos = random(POS_SCALE * ROPE_LEDS);
            particles[k].hue = random(360);
            particles[k].len = 8;
            particles[k].speed = k == 0 ? -1 : k;
            particles[k].hue_v = 1;
            particles[k].bright = 255;
            particles[k].wrap = true;
        }
        collision_mode = COLLIDE_BOOM;
        fade_speed = 64;
    }
    else if (mode == RANDCHASE)
    {
        // Take a random count, but make large numbers much less likely
        int count = min(
            random(4, MAX_PARTICLES + 1),
            random(4, MAX_PARTICLES + 1),
            random(2, MAX_PARTICLES + 1));

        int reverse = random(count);
        for (int k = 0; k < count; k++)
        {
            particles[k].pos = random(POS_SCALE * ROPE_LEDS);
            particles[k].hue = random(360);
            particles[k].len = random(4, 8);
            particles[k].speed = k <= reverse ? -random(1, count) : random(1, count);
            particles[k].hue_v = random(1);
            particles[k].bright = random(192, 256);
            particles[k].wrap = true;
        }
        collision_mode = COLLIDE_BOOM;
        collide_same_direction = random(1) ? true : false;
        fade_speed = 64;
    }
    else if (mode == FLOWER)
    {
        fade_speed = 2;
        for (int k = 0; k < 2; k++)
        {
            particles[k].pos = 0;
            particles[k].hue = 0;
            particles[k].len = 50;
            particles[k].speed = k == 0 ? -5 : +5;
            particles[k].hue_v = 0;
            particles[k].bright = 64;
            particles[k].wrap = false;
        }
        fade_speed = 8;
        color_mode = RGB;
        mult_rgb(255, 0, 0);
    }
    else if (mode == FLASH)
    {
        state_loop = (uint8_t)(512 / FLASH_STEP);

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

/**
 * display_reset() is called after the state_loop is hit and state is reset to zero again
 */
void display_reset(void)
{
    if (display_mode == FLASH)
    {
        display_setup(OFF);
    }
}

void start(void)
{
    log("Display started!");
    display_setup(OFF);
}

/**********************************************
 * Step functions
 **********************************************/

void point_render(int k)
{
    int hue = particles[k].hue;
    int highlight = (int)(particles[k].pos / POS_SCALE);
    int length = min(particles[k].len, particles[k].age);
    int bright = particles[k].bright;

    // Young and dying particles fade in/out
    if (collision_mode == COLLIDE_BOOM)
    {
        if (particles[k].respawn > 0)
        {
            if (particles[k].age > bright)
            {
                return;
            }
            bright -= particles[k].age;
        }
        else
        {
            bright = min(particles[k].age, bright);
        }
    }

    if (!particles[k].wrap)
    {
        if (particles[k].speed >= 0)
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
                (highlight - (particles[k].speed >= 0 ? tail : -tail) + ROPE_LEDS) % ROPE_LEDS,
                hue, 255, (bright * (length - tail)) / length,
                COLOR_ADD);
        }
    }
    else if (color_mode == RGB)
    {
        for (int tail = 0; tail < length; tail++)
        {
            int tailBright = (bright * (length - tail)) / length;
            rgb(
                (highlight - (particles[k].speed >= 0 ? tail : -tail) + ROPE_LEDS) % ROPE_LEDS,
                min(r_mult, bright), min(g_mult, bright), min(b_mult, bright),
                COLOR_ADD);
        }
    }
    else
    {
        log("Unknown color_mode");
    }
}

int distance(int k, int j)
{
    int d = abs(k - j);
    return min(d, ROPE_LEDS - d);
}

void render_display(void)
{
    if (last_auto > 0)
    {
        if (millis() - last_auto > 5000)
        {
            display_setup((display_mode + 1) % NUM_DISPLAY_MODES);
            last_auto = millis();
        }
    }

    if (display_mode == PULSE)
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
    else if (display_mode == SPARKLE)
    {
        if (state % 5 == 0)
        {
            hsv(random(ROPE_LEDS), random(360), 255, random(96, 256), COLOR_ADD);
        }
        if (state % 2 == 0)
        {
            rope_fade(1);
        }
        delay(10);
    }
    else if (display_mode == NOISE)
    {
        for (int i = 0; i < ROPE_LEDS; i++)
        {
            uint8_t value = gamma8_floor[random(256)];
            rgb(i, value, value, value);
        }
    }
    else if (display_mode == FLASH)
    {
        int partial = 0;
        int flashState = state * FLASH_STEP;
        int bright = min(255, (flashState > 255 ? 512 - flashState : flashState));

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
                display_setup(OFF);
                return;
            }
            rope_rgb(gamma8[bright], 0, 0);
        }
        delay(50);
    }
    else if (display_mode == RAINBOW)
    {
        particles[0].pos = (particles[0].pos + 1) % ROPE_LEDS;
        int dark = particles[0].pos;

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

    for (int k = 0; k < MAX_PARTICLES; k++)
    {
        if (particles[k].len == 0)
        {
            continue;
        }

        if (particles[k].respawn > 0)
        {
            particles[k].respawn--;
            if (particles[k].respawn == 0)
            {
                particles[k].age = 0;
                particles[k].pos = random(POS_MAX);
            }
        }
        point_render(k);
        if (particles[k].age < UINT_MAX)
        {
            particles[k].age++;
        }

        if (particles[k].respawn > 0)
        {
            continue;
        }

        // Manage particle age and color
        particles[k].hue = (particles[k].hue + particles[k].hue_v + 360) % 360;

        // Area slowdown: This was initially intended so that the lines would match up, but the numbers
        // to achieve that are slightly off.
        int pos = particles[k].pos / POS_SCALE;
        if (state % 3 == 0 && pos >= 200 && pos <= 250)
        {
            continue;
        }

        int prevPos = particles[k].pos;
        int nextPos = (particles[k].pos + particles[k].speed + POS_MAX) % POS_MAX;
        particles[k].pos = nextPos;

        // This respawn logic is particularly weak, but it's a nice start
        if (collision_mode != COLLIDE_BOOM)
        {
            continue;
        }
        for (int j = 0; j < MAX_PARTICLES; j++)
        {
            if (k == j || particles[j].len == 0 || particles[j].age < 256 || particles[j].respawn != 0)
            {
                continue;
            }
            bool collided = (((prevPos < particles[j].pos && nextPos >= particles[j].pos) || (prevPos > particles[j].pos && nextPos <= particles[j].pos)) && abs((prevPos - nextPos) < POS_MAX / 2) &&
                             (collide_same_direction || particles[k].speed * particles[j].speed < 0));
            if (collided)
            {
                log("Boom!");
                // Set the particles to respawn, but give enough time to fade out
                particles[k].respawn = 256 + random(256);
                particles[k].age = 0;

                particles[j].respawn = 256 + random(256);
                particles[j].age = 0;
            }
        }
    }
}

void step(void)
{
    render_display();
    state = (uint16_t)(state + 1);
    if (state_loop && state >= state_loop)
    {
        state = 0;
        display_reset();
    }
}

/**********************************************
 * Unused animations
 **********************************************/
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

void render_join_halves(void)
{
    int half = ROPE_LEDS / 2;
    for (int k = 0; k < half; k++)
    {
        hsv(k, (state + k) % 360, 255, k < (state % half) ? 255 : 0);
        hsv(ROPE_LEDS - k - 1, (state + k) % 360, 255, k < (state % half) ? 255 : 0);
    }
}