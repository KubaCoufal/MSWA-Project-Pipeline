import { expect, test } from '@playwright/test'

test('admin can create and monitor a pipeline from the browser', async ({ page }) => {
  const suffix = Date.now()
  const datasetName = `ui-dataset-${suffix}`
  const pipelineName = `ui-pipeline-${suffix}`
  const ruleName = `ui-runtime-rule-${suffix}`

  await page.goto('/datasets')
  await page.getByRole('button', { name: 'Add dataset' }).click()
  await page.getByLabel('Dataset name').fill(datasetName)
  await page.getByLabel('Owner').fill('ui-test-team')
  await page.getByLabel('Schema version').fill('2')
  await page.getByLabel('Description').fill('Dataset created by Playwright.')
  await page.getByRole('button', { name: 'Create dataset' }).click()
  await expect(page.getByText(datasetName)).toBeVisible()

  await page.goto('/pipelines')
  await page.getByRole('button', { name: 'Add pipeline' }).click()
  await page.getByLabel('Pipeline source').click()
  await page.getByRole('option', { name: 'Simulated run' }).click()
  await page.getByLabel('Internal dataset').click()
  await page.getByRole('option', { name: datasetName }).click()
  await page.getByLabel('Pipeline name').fill(pipelineName)
  await page.getByLabel('Scheduled run').check()
  await page.getByLabel('Run time').fill('05:00')
  await page.getByLabel('Description').fill('Pipeline created by Playwright.')
  await page.getByRole('button', { name: 'Create pipeline' }).click()
  await expect(page.getByText(pipelineName)).toBeVisible()

  await page.goto('/alert-rules')
  await page.getByRole('button', { name: 'Add rule' }).click()
  await page.getByLabel('Pipeline').click()
  await page.getByRole('option', { name: pipelineName }).click()
  await page.getByLabel('Rule name').fill(ruleName)
  await page.getByLabel('Rule type').click()
  await page.getByRole('option', { name: 'Runtime exceeded' }).click()
  await page.getByLabel('Threshold seconds').fill('1')
  await page.getByRole('button', { name: 'Create rule' }).click()
  await expect(page.getByText(ruleName)).toBeVisible()

  await page.goto('/pipelines')
  const pipelineRow = page.getByRole('row').filter({ hasText: pipelineName })
  await pipelineRow.getByRole('button', { name: 'Run' }).click()

  await page.goto('/alerts')
  const alertRow = page.getByRole('row').filter({ hasText: pipelineName })
  await expect(alertRow).toContainText('open', { timeout: 20_000 })
  await alertRow.getByRole('button', { name: 'Acknowledge' }).click()
  await expect(alertRow).toContainText('acknowledged', { timeout: 10_000 })
})
