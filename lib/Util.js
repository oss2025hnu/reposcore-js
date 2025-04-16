// log 타임스탬프 추가 로직
function log(message) {
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }).replace('T', ' ');
    console.log(`[${now}] ${message}`);
}

export {
    log
};
