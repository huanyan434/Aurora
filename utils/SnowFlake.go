package utils

import (
	"fmt"
	"sync"
	"time"
)

// 包内全局变量，保存雪花ID生成的状态
var (
	snowflakeStartTime      int64
	snowflakeSequence       int64
	snowflakeLastTime       int64
	snowflakeSequenceBits   int64
	snowflakeTimestampShift int64
	snowflakeSequenceMask   int64
	snowflakeMutex          sync.Mutex
)

// 初始化雪花ID生成器的参数
func init() {
	// 2025-10-01 00:00:00 UTC 对应的毫秒时间戳
	snowflakeStartTime = int64(1759315200000)
	snowflakeSequenceBits = 5
	snowflakeTimestampShift = snowflakeSequenceBits
	snowflakeSequenceMask = -1 ^ (-1 << snowflakeSequenceBits)
	snowflakeSequence = 0
	snowflakeLastTime = -1
}

// GenerateSnowflakeId 直接生成一个雪花ID
func GenerateSnowflakeId() (int64, error) {
	snowflakeMutex.Lock()
	defer snowflakeMutex.Unlock()

	timestamp := time.Now().UnixMilli()

	// 时钟回退校验
	if timestamp < snowflakeLastTime {
		return 0, fmt.Errorf("clock moved backwards. refuse to generate id for %dms", snowflakeLastTime-timestamp)
	}

	// 同毫秒序列递增，溢出则等待下毫秒
	if snowflakeLastTime == timestamp {
		snowflakeSequence = (snowflakeSequence + 1) & snowflakeSequenceMask
		if snowflakeSequence == 0 {
			// 等待到下一个毫秒
			for timestamp <= snowflakeLastTime {
				timestamp = time.Now().UnixMilli()
			}
		}
	} else {
		snowflakeSequence = 0 // 跨毫秒重置序列
	}

	snowflakeLastTime = timestamp

	// 生成ID：时间戳差左移 + 序列
	return (timestamp-snowflakeStartTime)<<snowflakeTimestampShift | snowflakeSequence, nil
}
