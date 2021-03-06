#define ROPE_LEDS 371
#define ROPE_OFFSET 0

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

enum BlendMode
{
    COLOR_SET = 0,
    COLOR_ADD = 1,
    COLOR_BLEND = 2,
};

enum ColorMode
{
    MODE_HSV = 1,
    MODE_RGB = 2,
};

/**********************************************
 * Color rendering logic
 **********************************************/
uint8_t blend(float amount, int a, int b);
void rgb(int pixel, uint8_t r, uint8_t g, uint8_t b, int mode = COLOR_SET);
void hsv(int pixel, int hue, uint8_t sat, uint8_t val, int mode = COLOR_SET);
void rope_fade(int amount);
void rope_rgb(uint8_t r, uint8_t g, uint8_t b);
void rope_hsv(int hue, uint8_t sat, uint8_t val);
void mult_rgb(int r, int g, int b);

extern uint8_t *ledBuffer;