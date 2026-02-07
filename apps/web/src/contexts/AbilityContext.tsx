import { createContext } from 'react';
import { createContextualCan } from '@casl/react';
import { AppAbility } from '@koubou-fes-pos/shared';

export const AbilityContext = createContext<AppAbility>(null!);
export const Can = createContextualCan(AbilityContext.Consumer);
