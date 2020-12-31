#include <neopixel.h>
#include <math.h>

SYSTEM_THREAD(ENABLED)
SYSTEM_MODE(AUTOMATIC);

// IMPORTANT: Set pixel COUNT, PIN and TYPE
#define PIXEL_PIN D2
#define ROPE_LEDS 371
#define ANIMATION_MS 10000
#define BREAK_MS 1000
#define PIXEL_TYPE WS2812B

Adafruit_NeoPixel strip(ROPE_LEDS, PIXEL_PIN, PIXEL_TYPE);

// Prototypes for local build, ok to leave in for Build IDE
void start();
void step();

void setup()
{
    strip.begin();
    strip.show();
    strip.setBrightness(128);
}

unsigned long lastTime = 0;
int state = 0;
int state_round = 0;

void loop()
{
    // Safe with rollover
    unsigned long now = millis();
    state += (now - lastTime);
    lastTime = now;

    if (state > ANIMATION_MS)
    {
        if (state <= ANIMATION_MS + BREAK_MS)
        {
            return;
        }
        strip.clear();
        strip.show();
        if (state > ANIMATION_MS + 2 * BREAK_MS)
        {
            state = 0;
            state_round += 1;
        }
        else
        {
            return;
        }
    }

    int msPerLight = ANIMATION_MS / ROPE_LEDS;
    int light = state / msPerLight;

    if (state_round % 2 == 0)
    {
        strip.clear();
    }

    if (light == ROPE_LEDS - 1)
    {
        strip.setPixelColor(light, 255, 255, 255);
    }
    else if (light % 100 == 0)
    {
        strip.setPixelColor(light, 0, 255, 0);
    }
    else if (light % 10 == 0)
    {
        strip.setPixelColor(light, 0, 0, 255);
    }
    else
    {
        strip.setPixelColor(light, 255, 0, 0);
    }

    strip.show();
}