import { examples } from '../data/catalog';

export interface Example {
  title: string;
  category: string;
  description: string;
  difficulty: number;
  file?: string;
  code: string;
}

export type ExampleGroupMap = Record<string | number, Example[]>;

export function getExamples(orderBy: string = ''): Example[] | ExampleGroupMap {
  const parts = orderBy ? orderBy.split(',') : [];
  const orderBy1 = parts[0];
  const orderBy2 = parts[1];

  if (orderBy1 === 'dif' || orderBy1 === 'cat') {
    const result: ExampleGroupMap = {};
    for (const e of examples) {
      let div: string | number | undefined = undefined;
      if (orderBy1 === 'dif') div = e.difficulty;
      else if (orderBy1 === 'cat') div = e.category;

      if (div !== undefined && div !== null) {
        if (!result[div]) result[div] = [];
        result[div].push({ ...e });
      }
    }

    const sortedKeys = Object.keys(result).sort((a, b) => {
      if (orderBy1 === 'dif') {
        return Number(a) - Number(b);
      }
      return a.localeCompare(b);
    });

    const sortedResult: ExampleGroupMap = {};
    for (const key of sortedKeys) {
      const arr = result[key]!;
      if (orderBy2 === 'dif') {
        arr.sort((a, b) => (a.difficulty ?? 0) - (b.difficulty ?? 0));
      } else if (orderBy2 === 'cat') {
        arr.sort((a, b) => (a.category ?? '').localeCompare(b.category ?? ''));
      } else {
        arr.sort((a, b) => a.title.localeCompare(b.title));
      }
      sortedResult[key] = arr;
    }
    return sortedResult;
  }

  return [...examples].sort((a, b) => a.title.localeCompare(b.title));
}
