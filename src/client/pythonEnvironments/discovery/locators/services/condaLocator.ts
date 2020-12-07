// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import '../../../../common/extensions';
import { PythonEnvInfo, PythonEnvKind } from '../../../base/info';
import { buildEnvInfo } from '../../../base/info/env';
import { IPythonEnvsIterator, Locator } from '../../../base/locator';
import { getEnvironmentDirFromPath, getInterpreterPathFromDir } from '../../../common/commonUtils';
import { arePathsSame } from '../../../common/externalDependencies';
import { Conda } from './conda';

export class CondaEnvironmentLocator extends Locator {
    private condaPromise: Promise<Conda | undefined> | undefined;

    public constructor(conda?: Conda) {
        super();
        if (conda !== undefined) {
            this.condaPromise = Promise.resolve(conda);
        }
    }

    public async getConda(): Promise<Conda | undefined> {
        if (this.condaPromise === undefined) {
            this.condaPromise = Conda.locate();
        }
        return this.condaPromise;
    }

    public async *iterEnvs(): IPythonEnvsIterator {
        const conda = await this.getConda();
        if (conda === undefined) {
            return;
        }

        const envs = await conda.getEnvList();
        for (const { name, prefix } of envs) {
            const executable = await getInterpreterPathFromDir(prefix);
            if (executable !== undefined) {
                const info = buildEnvInfo({
                    executable,
                    kind: PythonEnvKind.Conda,
                    location: prefix,
                });
                if (name) {
                    info.name = name;
                }
                yield info;
            }
        }
    }

    public async resolveEnv(env: string | PythonEnvInfo): Promise<PythonEnvInfo | undefined> {
        const exePath = typeof env === 'string' ? env : env.executable.filename;
        const location = getEnvironmentDirFromPath(exePath);
        for await (const info of this.iterEnvs()) {
            if (arePathsSame(info.location, location)) {
                return info;
            }
        }
        return undefined;
    }
}
