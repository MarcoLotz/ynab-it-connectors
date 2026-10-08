## What does this change?



## Adding or changing a connector?

- [ ] `src/connectors/<id>.ts`, `test/data/<id>.<ext>` and `test/<id>.test.ts` are included, and the connector is registered in `src/index.ts`
- [ ] The sample keeps the real export's structure, with all personal data replaced by fake data
- [ ] Every row the connector skips or treats specially is in the sample and commented in the test
- [ ] I followed `howToExport` myself and it leads to this exact file
- [ ] `npm run check` passes
- [ ] The connector's name is in `README.md`
