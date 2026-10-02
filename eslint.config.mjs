import next from "eslint-config-next/core-web-vitals";
const config = [...next, { ignores: [".next/**"] }];

export default config;
