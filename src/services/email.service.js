async function sendMail({ to, subject, text }) {
    console.log('\n=== Simulated email ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(text);
    console.log('=======================\n');
    return true;
}

module.exports = { sendMail };
