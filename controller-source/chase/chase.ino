// This #include statement was automatically added by the Particle IDE.
#include <neopixel.h>

// This #include statement was automatically added by the Particle IDE.
#include <neopixel.h>

// This #include statement was automatically added by the Particle IDE.
#include <neopixel.h>
#include <math.h>




/**
 * This is a minimal example, see extra-examples.cpp for a version
 * with more explantory documentation, example routines, how to
 * hook up your pixels and all of the pixel types that are supported.
 *
 * On Photon, Electron, P1, Core and Duo, any pin can be used for Neopixel.
 *
 * On the Argon, Boron and Xenon, only these pins can be used for Neopixel:
 * - D2, D3, A4, A5
 * - D4, D6, D7, D8
 * - A0, A1, A2, A3
 *
 * In addition on the Argon/Boron/Xenon, only one pin per group can be used at a time.
 * So it's OK to have one Adafruit_NeoPixel instance on pin D2 and another one on pin
 * A2, but it's not possible to have one on pin A0 and another one on pin A1.
 */

#include "Particle.h"
#include "neopixel.h"

SYSTEM_THREAD(ENABLED)
SYSTEM_MODE(AUTOMATIC);

// IMPORTANT: Set pixel COUNT, PIN and TYPE
#define PIXEL_PIN D2
#define ROPE_LEDS 300
#define PIXEL_TYPE WS2812B

Adafruit_NeoPixel strip(ROPE_LEDS, PIXEL_PIN, PIXEL_TYPE);

// Prototypes for local build, ok to leave in for Build IDE
void start();
void step();
uint8_t *ledBuffer;
#define RELAY_PIN 5

// PROGMEM?
const uint8_t gamma8[] = {
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2,
    2, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5,
    5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10,
    10, 10, 11, 11, 11, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 16,
    17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 24, 24, 25,
    25, 26, 27, 27, 28, 29, 29, 30, 31, 32, 32, 33, 34, 35, 35, 36,
    37, 38, 39, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 50,
    51, 52, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 66, 67, 68,
    69, 70, 72, 73, 74, 75, 77, 78, 79, 81, 82, 83, 85, 86, 87, 89,
    90, 92, 93, 95, 96, 98, 99, 101, 102, 104, 105, 107, 109, 110, 112, 114,
    115, 117, 119, 120, 122, 124, 126, 127, 129, 131, 133, 135, 137, 138, 140, 142,
    144, 146, 148, 150, 152, 154, 156, 158, 160, 162, 164, 167, 169, 171, 173, 175,
    177, 180, 182, 184, 186, 189, 191, 193, 196, 198, 200, 203, 205, 208, 210, 213,
    215, 218, 220, 223, 225, 228, 231, 233, 236, 239, 241, 244, 247, 249, 252, 255};
const uint8_t gamma8_floor[] = {
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2,
    2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5,
    5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7, 8, 8, 8, 9, 9,
    9, 10, 10, 11, 11, 11, 12, 12, 12, 13, 13, 14, 14, 15, 15, 16,
    16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 23, 23, 24, 24,
    25, 26, 26, 27, 28, 28, 29, 30, 30, 31, 32, 33, 33, 34, 35, 36,
    37, 37, 38, 39, 40, 41, 42, 42, 43, 44, 45, 46, 47, 48, 49, 50,
    51, 52, 53, 54, 55, 56, 57, 58, 59, 61, 62, 63, 64, 65, 66, 67,
    69, 70, 71, 72, 74, 75, 76, 77, 79, 80, 81, 83, 84, 86, 87, 88,
    90, 91, 93, 94, 96, 97, 99, 100, 102, 103, 105, 107, 108, 110, 111, 113,
    115, 116, 118, 120, 122, 123, 125, 127, 129, 130, 132, 134, 136, 138, 140, 142,
    144, 146, 148, 150, 152, 154, 156, 158, 160, 162, 164, 166, 168, 170, 172, 175,
    177, 179, 181, 184, 186, 188, 191, 193, 195, 198, 200, 202, 205, 207, 210, 212,
    215, 217, 220, 222, 225, 227, 230, 233, 235, 238, 241, 243, 246, 249, 252, 255};
const uint8_t gamma8_partial[] = {
    0, 0, 0, 0, 0, 1, 1, 2, 4, 5, 7, 9, 12, 15, 19, 23,
    28, 33, 39, 45, 52, 60, 68, 77, 87, 97, 109, 121, 134, 148, 163, 178,
    195, 212, 231, 251, 15, 37, 60, 83, 108, 135, 162, 190, 220, 251, 27, 61,
    96, 132, 169, 208, 248, 34, 77, 122, 168, 215, 8, 59, 111, 165, 220, 22,
    80, 141, 203, 10, 76, 143, 212, 27, 100, 174, 251, 73, 153, 235, 63, 149,
    237, 71, 163, 1, 97, 195, 40, 142, 247, 97, 206, 61, 175, 34, 152, 16,
    138, 7, 134, 7, 139, 17, 154, 37, 178, 66, 212, 105, 1, 155, 55, 214,
    120, 28, 195, 109, 25, 200, 122, 46, 229, 159, 92, 28, 222, 163, 107, 54,
    4, 213, 169, 127, 89, 53, 21, 248, 221, 198, 178, 161, 147, 136, 128, 124,
    123, 124, 129, 138, 149, 164, 182, 204, 229, 1, 32, 67, 105, 147, 192, 241,
    37, 92, 151, 214, 24, 94, 167, 244, 68, 152, 240, 75, 170, 13, 115, 221,
    75, 189, 50, 171, 40, 169, 46, 182, 67, 211, 103, 0, 156, 60, 224, 136,
    52, 228, 152, 80, 13, 205, 146, 90, 39, 248, 205, 167, 132, 102, 76, 54,
    37, 24, 15, 11, 11, 15, 24, 37, 54, 76, 102, 133, 168, 208, 252, 45,
    99, 157, 219, 30, 102, 178, 3, 89, 179, 18, 118, 222, 75, 189, 52, 175,
    48, 181, 63, 206, 97, 250, 151, 58, 225, 141, 62, 245, 176, 112, 53, 0};

void rope_clear()
{
  memset(ledBuffer, 0, ROPE_LEDS * 3);
}

void particleShow(const char *event, const char *data)
{
    const char *next = event + strlen("show/");
    while (next[0] != '\0') {
        // search for a space or end
        int idx = 1;
        while (next[idx] != '/' && next[idx] != ' ' && next[idx] != '\0') {
            idx += 1;
        }

        message(next, idx);
        if (next[idx] == '\0') {
            break;
        }
        next = next + idx + 1;
    }
}

void setup()
{
  strip.begin();
  strip.show(); // Initialize all pixels to 'off'
  ledBuffer = strip.getPixels();
  start();
  Particle.subscribe("show/", particleShow);
  message("off", 3);
}

void loop()
{
    step();
    strip.show();
}

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
    CHASE_ONE = 5,
    RANDCHASE = 6,
    NUM_DISPLAY_MODES = 7,

    DISPLAY_FLASH = 64,

    DISPLAY_OFF = 255,
};

enum ColorMode
{
    MODE_HSV = 1,
    MODE_RGB = 2,
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

int mode_hue = 0;
int v_max = 255;

// These are all configured during display_setup()
ColorMode color_mode = MODE_HSV;
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

void set_particle_count(int count) {
    for (unsigned int k = count; k < MAX_PARTICLES; k++) {
        particles[k].len = 0;
    }
}
void set_mode_hue(int hue) {
    mode_hue = hue;
    for (unsigned int k = 0; k < MAX_PARTICLES; k++) {
        particles[k].hue = hue;
    }
}
void message(const char *message, int length)
{
    if (strncmp(message, "light", length) == 0)
    {
        switch_light(true);
    }
    else if (strncmp(message, "on", length) == 0)
    {
        switch_light(true);
        display_setup(CHASE);
        last_auto = millis();
    }
    else if (strncmp(message, "chase", length) == 0)
    {
        display_setup(CHASE);
    }
    else if (strncmp(message, "randchase", length) == 0)
    {
        display_setup(RANDCHASE);
    }
    else if (strncmp(message, "flower", length) == 0)
    {
        display_setup(FLOWER);
    }
    else if (strncmp(message, "pulse", length) == 0)
    {
        display_setup(PULSE);
    }
    else if (strncmp(message, "sparkle", length) == 0)
    {
        display_setup(SPARKLE);
    }
    else if (strncmp(message, "flash", length) == 0)
    {
        display_setup(DISPLAY_FLASH);
        mode_hue = random(360);
    }
    else if (strncmp(message, "one", length) == 0)
    {
        set_particle_count(1);
    }
    else if (strncmp(message, "two", length) == 0)
    {
        set_particle_count(2);
    }
    else if (strncmp(message, "three", length) == 0)
    {
        set_particle_count(3);
    }
    else if (strncmp(message, "four", length) == 0)
    {
        set_particle_count(4);
    }
    else if (strncmp(message, "five", length) == 0)
    {
        set_particle_count(5);
    }
    else if (strncmp(message, "red", length) == 0)
    {
        set_mode_hue(0);
    }
    else if (strncmp(message, "green", length) == 0)
    {
        set_mode_hue(120);
    }
    else if (strncmp(message, "blue", length) == 0)
    {
        set_mode_hue(240);
    }
    else if (strncmp(message, "yellow", length) == 0)
    {
        set_mode_hue(60);
    }
    else if (strncmp(message, "turquoise", length) == 0)
    {
        set_mode_hue(180);
    }
    else if (strncmp(message, "pink", length) == 0)
    {
        set_mode_hue(300);
    }
    else if (strncmp(message, "rainbow", length) == 0)
    {
        display_setup(RAINBOW);
    }
    else if (strncmp(message, "off", length) == 0)
    {
        switch_light(false);
        display_setup(DISPLAY_OFF);
    }
}

void configure_chase(int count, bool collide) {
    for (int k = 0; k < count; k++)
    {
        particles[k].pos = random(POS_SCALE * ROPE_LEDS);
        particles[k].hue = random(360);
        particles[k].len = 8;
        particles[k].speed = k == 0 ? -1 : k;
        particles[k].hue_v = 1;
        particles[k].bright = 255;
        particles[k].wrap = true;
    }
    for (int k = count; k < MAX_PARTICLES; k++) {
        particles[k].len = 0;
    }
    collision_mode = COLLIDE_BOOM;
    collide_same_direction = collide;
    fade_speed = 64;
}
void display_setup(DisplayMode mode)
{
    rope_clear();
    display_mode = mode;

    color_mode = MODE_HSV;
    last_auto = 0;
    fade_speed = 16;
    state = 0;
    state_loop = 0;
    collision_mode = COLLIDE_OFF;
    collide_same_direction = false;
    v_max = 255;

    for (int k = 0; k < MAX_PARTICLES; k++)
    {
        particles[k].age = 0;
        particles[k].len = 0;
        particles[k].respawn = 0;
    }

    if (mode == DISPLAY_OFF)
    {
        fade_speed = 256;
    }
    else if (mode == CHASE)
    {
        configure_chase(8, true);
    }
    else if (mode == RANDCHASE)
    {
        // Take a random count, but make large numbers much less likely
        int count = min(min(
            random(4, MAX_PARTICLES + 1),
            random(4, MAX_PARTICLES + 1)),
            random(2, MAX_PARTICLES + 1));

        configure_chase(count, random(1) ? true : false);

        int reverse = random(count);
        for (int k = 0; k < count; k++)
        {
            particles[k].len = random(4, 8);
            particles[k].speed = k <= reverse ? -random(1, count) : random(1, count);
            particles[k].hue_v = random(1);
            particles[k].bright = random(192, 256);
        }
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
            particles[k].hue_v = mode_hue;
            particles[k].bright = 64;
            particles[k].wrap = false;
        }
        fade_speed = 8;
        color_mode = MODE_RGB;
        mult_rgb(255, 0, 0);
    }
    else if (mode == DISPLAY_FLASH)
    {
        state_loop = (uint8_t)(512 / FLASH_STEP);
        v_max = 120;
    }
    else if (mode == PULSE)
    {
        mult_rgb(150, 150, 150);
        state_loop = 512;
    }
    else if (mode == RAINBOW)
    {
        state_loop = 360;
        v_max = 120;
    }
    else if (mode == CHASE_ONE)
    {
        configure_chase(1, true);
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
    if (display_mode == DISPLAY_FLASH)
    {
        display_setup(DISPLAY_OFF);
    }
}

void start(void)
{
    // log("Display started!");
    display_setup(DISPLAY_OFF);
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

    if (color_mode == MODE_HSV)
    {
        for (int tail = 0; tail < length; tail++)
        {
            hsv(
                (highlight - (particles[k].speed >= 0 ? tail : -tail) + ROPE_LEDS) % ROPE_LEDS,
                hue, 255, (bright * (length - tail)) / length,
                COLOR_ADD);
        }
    }
    else if (color_mode == MODE_RGB)
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
        //log("Unknown color_mode");
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
            display_setup((DisplayMode) ((display_mode + 1) % NUM_DISPLAY_MODES));
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

        rope_rgb(min(32 + pulse, r_mult), 0, 0);
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
    else if (display_mode == DISPLAY_FLASH)
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

            hsv(i, mode_hue, 255, min(v_max, value));
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
                display_setup(DISPLAY_OFF);
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
            hsv(k, (state + k) % 360, 255, dist < 10 ? v_max - (9-dist) * (v_max / 10) : v_max);
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
                Serial.println("Boom!");
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