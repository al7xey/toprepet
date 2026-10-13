import { expect, test } from '@playwright/test';
import { rest, signInNewTutor } from './helpers';

test.describe('Р3.2 горизонт записи и минимальное время', () => {
  test('Р3.2 по умолчанию 2 недели и 12 ч, варианта «2 часа» нет', async ({ page, request }, info) => {
    await signInNewTutor(page, request, info);
    await page.goto('/tutor/schedule/');
    const horizon = page.getByRole('group', { name: 'Записываться можно вперёд на' });
    const lead = page.getByRole('group', { name: 'Не раньше чем за' });
    await expect(horizon.getByRole('radio')).toHaveCount(3);
    await expect(horizon.getByRole('radio', { name: '1 неделю' })).not.toBeChecked();
    await expect(horizon.getByRole('radio', { name: '2 недели' })).toBeChecked();
    await expect(horizon.getByRole('radio', { name: '4 недели' })).not.toBeChecked();
    await expect(lead.getByRole('radio')).toHaveCount(2);
    await expect(lead.getByRole('radio', { name: /^12\s*ч$/ })).toBeChecked();
    await expect(lead.getByRole('radio', { name: /^24\s*ч$/ })).not.toBeChecked();
    await expect(lead.getByRole('radio', { name: /^2\s*(ч|час)/ })).toHaveCount(0);
    await expect(page.getByText('Ученики не увидят окна в прошлом и ближе 12 часов.')).toBeVisible();
  });

  test('Р3.2 выбранные горизонт и минимальное время сохраняются', async ({ page, request }, info) => {
    const tutor = await signInNewTutor(page, request, info);
    await page.goto('/tutor/schedule/');
    await page.getByRole('radio', { name: '4 недели' }).check();
    await page.getByRole('radio', { name: /^24\s*ч$/ }).check();
    await expect(page.getByText('Ученики не увидят окна в прошлом и ближе 24 часов.')).toBeVisible();
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.getByText('Сохранили расписание.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: '4 недели' })).toBeChecked();
    await expect(page.getByRole('radio', { name: /^24\s*ч$/ })).toBeChecked();
    const row = (await rest(request, tutor.token).get(`tutors?user_id=eq.${tutor.id}&select=horizon_weeks,min_lead_hours`)).body;
    expect(row).toEqual([{ horizon_weeks: 4, min_lead_hours: 24 }]);
  });
});
