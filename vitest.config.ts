import { defineConfig } from 'vitest/config'
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        env: {
            'SECRET_KEY': 'TEST_SECRET_KEY',
            'PUBLIC_URL_ORIGIN': 'TEST_PUBLIC_URL_ORIGIN',
            'BYOS_DEVICE_MAC': 'TEST_BYOS_DEVICE_MAC',
            'BYOS_DEVICE_ACCESS_TOKEN': 'TEST_BYOS_DEVICE_ACCESS_TOKEN'
        }
    },
})