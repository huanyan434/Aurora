// 雪花ID生成器的状态变量
const snowflakeState = {
    startTime: 1759315200000n, // 2025-10-01 00:00:00 UTC
    sequenceBits: 5n,
    timestampShift: 5n,
    sequenceMask: -1n ^ (-1n << 5n),
    sequence: 0n,
    lastTimestamp: -1n,
    locked: false
};

/**
 * 直接生成一个雪花ID
 * @returns {bigint} 生成的雪花ID
 */
export function generateSnowflakeId(): bigint {
    // 简单的锁机制确保并发安全
    while (snowflakeState.locked) {}
    snowflakeState.locked = true;

    try {
        let timestamp = BigInt(Date.now());

        // 时钟回退校验
        if (timestamp < snowflakeState.lastTimestamp) {
            throw new Error(`clock moved backwards. refuse to generate id for ${Number(snowflakeState.lastTimestamp - timestamp)}ms`);
        }

        // 同毫秒序列递增，溢出则等待下毫秒
        if (snowflakeState.lastTimestamp === timestamp) {
            snowflakeState.sequence = (snowflakeState.sequence + 1n) & snowflakeState.sequenceMask;
            if (snowflakeState.sequence === 0n) {
                // 等待到下一个毫秒
                let newTimestamp = BigInt(Date.now());
                while (newTimestamp <= snowflakeState.lastTimestamp) {
                    newTimestamp = BigInt(Date.now());
                }
                timestamp = newTimestamp;
            }
        } else {
            snowflakeState.sequence = 0n; // 跨毫秒重置序列
        }

        snowflakeState.lastTimestamp = timestamp;

        // 生成ID：时间戳差左移 + 序列
        return (timestamp - snowflakeState.startTime) << snowflakeState.timestampShift | snowflakeState.sequence;
    } finally {
        snowflakeState.locked = false;
    }
}