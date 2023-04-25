#include "Particle.h"
#include "neopixel.h"
#include "rgb.h"

SYSTEM_MODE(AUTOMATIC);
SYSTEM_THREAD(ENABLED)

// IMPORTANT: Set pixel COUNT, PIN and TYPE
#define PIXEL_PIN D2
#define PIXEL_COUNT 480
#define PIXEL_TYPE WS2812B

Adafruit_NeoPixel strip(PIXEL_COUNT, PIXEL_PIN, PIXEL_TYPE);

int x = 0;

void (*renderer)(void);


void off(void) {

}
void bounce(void) {
        int p = x % PIXEL_COUNT;
        if (x >= PIXEL_COUNT) {
            strip.setPixelColor(PIXEL_COUNT - p - 1, strip.Color(x % 255,(x * 2) % 255, (x * 3) % 256));
        } else {
            strip.setPixelColor(p, strip.Color(x % 255,(x * 2) % 255, (x * 3) % 256));
        }
}

void rainbow(void) {
    for(int i=0; i < PIXEL_COUNT; i++) {
        hsv(i, (i + x) % 360, 100, 100);
    }
}


void show(const char *event, const char *data)
{
    if (strcmp(event, "show/off") == 0) {
        renderer = off;
    } else if (strcmp(event, "show/bounce") == 0) {
        renderer = bounce;
    } else  if (strcmp(event, "show/rainbow") == 0) {
        renderer = rainbow;
    }
}

void setup()
{
  strip.begin();
  strip.show();

  renderer = off;
  ledBuffer = strip.getPixels();

  Particle.subscribe("show/", show);
}

void loop()
{
    int i;
    x = (x + 2) % (2 * PIXEL_COUNT);

    for(i=0; i < PIXEL_COUNT; i++) {
        strip.setPixelColor(i, strip.Color(0,0,0));
    }
    
   renderer();
   strip.show();
}