#include "main.h"

unsigned long lastTime = 0;
int ms = 0;

enum ANIMATION
{
    OFF = 0,
    SCHEDULED = 1,
    BLOCK = 2,
    BLOCK_RAINBOW = 3,
    FADE = 4,
};

ANIMATION animation = OFF;

void showRing(int ring)
{
    for (int k = ringStart[ring]; k < ringStart[ring] + ringSize[ring]; k++)
    {
        int index = ringIndexOffset + ringIndex[k];
        int colorIndex = ring + index + ((int)(ms / 150));
        int color = 16 * (colorIndex % 16);
        rgb(
            index,
            ring % 2 == 0 ? color : 0,
            ring % 2 == 1 ? color : 0,
            ring % 3 == 0 ? color : 0);
    }
}
int ringX(int index)
{
    return (int)(ringIndex[index] / 16);
}
int ringY(int index)
{
    int rI = ringIndex[index];
    if (ringX(index) % 2 == 0)
    {
        return rI % 16;
    }
    else
    {
        return 15 - rI % 16;
    }
}
void ringHSV(int ring, int h, int s, int v)
{
    for (int k = ringStart[ring]; k < ringStart[ring] + ringSize[ring]; k++)
    {
        int index = ringIndexOffset + ringIndex[k];
        hsv(index, (h + k) % 360, s, v);
    }
}
void loop()
{
    // Safe with rollover
    unsigned long now = millis();
    ms += (now - lastTime);
    lastTime = now;

    if (animation == OFF)
    {
        strip.clear();
    }
    else
    {
        rope_fade(1);
        mult_rgb(96, 96, 96);
    }

    if (animation == BLOCK)
    {
        int ring = (int)(ms / 1000);
        if (ring >= ringCount)
        {
            animation = BLOCK_RAINBOW;
            ms = 0;
        }
        else
        {
            showRing(ringCount - ring - 1);
        }
    }
    else if (animation == BLOCK_RAINBOW)
    {
        int step = ((int)(ms / 50));
        // ~160 steps of animation
        if (step < ringIndexOffset)
        {
            hsv(step, (step * 15) % 360, 255, 96);
        }
        else
        {
            step -= ringIndexOffset;
            for (int k = 0; k < ringCount; k++)
            {
                int v = -20 * (ringCount - k - 1) + 5 * step;
                if (v > 0)
                {
                    ringHSV(k, (k * 30 + ((int)(ms / 10))) % 360, 255, min(v, 96));
                }
            }
        }
        if (step > 160)
        {
            animation = FADE;
        }
    }
    else if (animation == SCHEDULED)
    {
        showRing(ringCount - 1);
    }
    strip.show();
}

void madeAttest(const char *event, const char *data)
{
    if (animation == OFF)
    {
        animation = FADE;
    }
    hsv(random(ROPE_LEDS), random(360), 255, 255);
}
void madeBlock(const char *event, const char *data)
{
    animation = BLOCK;
    ms = 0;
}
void scheduledBlock(const char *event, const char *data)
{
    animation = SCHEDULED;
    ms = 0;
}

void setup()
{
    strip.begin();
    strip.show(); // Initialize all pixels to 'off'
    ledBuffer = strip.getPixels();
    Particle.subscribe("show/eth2-attest", madeAttest);
    Particle.subscribe("show/eth2-block", madeBlock);
    Particle.subscribe("show/eth2-scheduled", scheduledBlock);
    animation = OFF;
    lastTime = millis();
    ms = 0;
}