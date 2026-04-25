package utils

import (
	"bytes"
	"crypto/sha256"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"path/filepath"
	"strings"
)

// AvatarSeed 生成头像使用的种子。
func AvatarSeed(userID string) string {
	return strings.TrimSpace(userID)
}

// GenerateAvatarBytes 生成对称格子风格头像并返回 PNG 二进制。
func GenerateAvatarBytes(seed string, size int) ([]byte, error) {
	if size <= 0 {
		size = 256
	}

	hash := sha256.Sum256([]byte(seed))
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	draw.Draw(img, img.Bounds(), &image.Uniform{C: color.RGBA{255, 255, 255, 255}}, image.Point{}, draw.Src)

	margin := size / 8
	grid := 7
	usable := size - margin*2
	cell := usable / grid
	if cell <= 0 {
		cell = 1
	}

	fg := color.RGBA{R: hash[0], G: hash[1], B: hash[2], A: 255}
	pattern := hash[3:]
	idx := 0
	for x := 0; x < grid/2+1; x++ {
		for y := 0; y < grid; y++ {
			b := pattern[idx%len(pattern)]
			idx++
			if b%2 != 0 {
				continue
			}

			x0 := margin + x*cell
			y0 := margin + y*cell
			draw.Draw(img, image.Rect(x0, y0, x0+cell, y0+cell), &image.Uniform{C: fg}, image.Point{}, draw.Src)

			mirrorX := margin + (grid-1-x)*cell
			if mirrorX != x0 {
				draw.Draw(img, image.Rect(mirrorX, y0, mirrorX+cell, y0+cell), &image.Uniform{C: fg}, image.Point{}, draw.Src)
			}
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GenerateAvatar 为指定用户生成头像文件，保留兼容用途。
func GenerateAvatar(userID int64, seed string, outputPath string, size int) error {
	if size <= 0 {
		size = 256
	}

	data, err := GenerateAvatarBytes(seed, size)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return err
	}

	return os.WriteFile(outputPath, data, 0o644)
}

// GenerateUserAvatar 为用户生成头像二进制。
func GenerateUserAvatar(userID string) ([]byte, error) {
	return GenerateAvatarBytes(AvatarSeed(userID), 256)
}
