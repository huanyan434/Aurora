package utils

import (
	"bytes"
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strings"

	"github.com/aofei/cameron"
)

// AvatarSeed 生成头像使用的种子。
func AvatarSeed(userID int64, email string) string {
	return fmt.Sprintf("%d:%s", userID, strings.ToLower(strings.TrimSpace(email)))
}

// GenerateAvatarBytes 生成 GitHub 风格头像并返回 PNG 二进制。
func GenerateAvatarBytes(seed string, size int) ([]byte, error) {
	if size <= 0 {
		size = 256
	}

	img := cameron.Identicon([]byte(seed), size)

	var buf bytes.Buffer
	if err := png.Encode(&buf, toRGBA(img)); err != nil {
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
func GenerateUserAvatar(userID int64, email string) ([]byte, error) {
	return GenerateAvatarBytes(AvatarSeed(userID, email), 256)
}

func toRGBA(src image.Image) image.Image {
	if _, ok := src.(*image.RGBA); ok {
		return src
	}

	bounds := src.Bounds()
	dst := image.NewRGBA(bounds)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			dst.Set(x, y, src.At(x, y))
		}
	}
	return dst
}
