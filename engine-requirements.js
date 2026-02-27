const isBun = typeof Bun !== 'undefined';
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

const memoryMB = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
const cpuCount = require('os').cpus().length;

function checkMemory() {
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory * 100).toFixed(1);
    
    if (memoryUsagePercent > 90) {
        console.warn(`⚠ Warning: System memory usage is high (${memoryUsagePercent}%)`);
    }
    
    return { totalMemory, freeMemory, usedMemory, memoryUsagePercent };
}

function getSystemInfo() {
    const os = require('os');
    return {
        platform: process.platform,
        arch: process.arch,
        cpus: os.cpus().length,
        totalMemory: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        freeMemory: (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        uptime: Math.floor(os.uptime() / 60) + ' minutes'
    };
}

function validateEnvironment() {
    const warnings = [];
    
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes('--max-old-space-size')) {
            warnings.push('Consider setting NODE_OPTIONS=--max-old-space-size=4096 for production');
        }
    }
    
    const totalMemGB = require('os').totalmem() / 1024 / 1024 / 1024;
    if (totalMemGB < 2) {
        warnings.push('Low system memory detected. Baileys may require at least 2GB RAM');
    }
    
    return warnings;
}

if (isBun) {
    const bunVersion = Bun.version;
    const major = parseInt(bunVersion.split(".")[0], 10);
    const minor = parseInt(bunVersion.split(".")[1], 10);

    if (major < 1 || (major === 1 && minor < 3)) {
        console.error(
            "\n========================================\n" +
            " Baileys requires Bun 1.3+ to run       \n" +
            "----------------------------------------\n" +
            `   You are using Bun ${bunVersion}\n` +
            "   Please upgrade to Bun 1.3+ to proceed.\n" +
            "========================================\n"
        );
        process.exit(1);
    }

    console.log(`✓ Running with Bun ${bunVersion}`);
    console.log(`✓ Platform: ${process.platform} (${process.arch})`);
    console.log(`✓ CPUs: ${cpuCount} cores`);
} else {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split(".")[0], 10);

    if (major < 18) {
        console.error(
            "\n========================================\n" +
            " Baileys requires Node.js 18+ to run    \n" +
            "----------------------------------------\n" +
            `   You are using Node.js ${nodeVersion}\n` +
            "   Please upgrade to Node.js 18+ to proceed.\n" +
            "========================================\n"
        );
        process.exit(1);
    }

    console.log(`✓ Running with Node.js ${nodeVersion}`);
    console.log(`✓ Platform: ${process.platform} (${process.arch})`);
    console.log(`✓ CPUs: ${cpuCount} cores`);
    
    const warnings = validateEnvironment();
    if (warnings.length > 0) {
        console.log('\nRecommendations:');
        warnings.forEach(w => console.log(`  • ${w}`));
    }
}

const memInfo = checkMemory();
console.log(`✓ Memory: ${memInfo.memoryUsagePercent}% used\n`);

if (process.env.BAILEYS_DEBUG === 'true') {
    console.log('System Information:');
    const sysInfo = getSystemInfo();
    Object.entries(sysInfo).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });
    console.log('');
}

process.on('uncaughtException', (error) => {
    console.error('\n❌ Uncaught Exception:', error.message);
    if (error.code === 'ERR_OUT_OF_MEMORY') {
        console.error('   Try increasing memory: NODE_OPTIONS=--max-old-space-size=4096');
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('\n❌ Unhandled Promise Rejection:', reason);
    process.exit(1);
});

module.exports = {
    isBun,
    isWindows,
    isMac,
    isLinux,
    getSystemInfo,
    checkMemory,
    validateEnvironment
};
