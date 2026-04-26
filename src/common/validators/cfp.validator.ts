export function isValidCPF(cpf : string){
    const cleaned = cpf.replace(/\D/g, '');

    if(cleaned.length !== 11) return false;
    if(/^(\d)\1{10}$/.test(cleaned)) return false;

    const calc = (factor : number) => {
        let sum = 0;
        for(let i = 0; i < factor - 1; i++){
            sum += parseInt(cleaned[i]) * (factor - i);
        }
        const rest = (sum * 10) % 11;
        return rest >= 10 ? 0 : rest;
    }

    return calc(10) === parseInt(cleaned[9]) && calc(11) === parseInt(cleaned[10]);
}