import { validate } from 'class-validator';
import { IsEmail } from 'class-validator';
import { IsCompanyEmail } from './is-company-email.decorator';

class TestDto {
  @IsEmail()
  @IsCompanyEmail()
  email!: string;
}

describe('IsCompanyEmail', () => {
  it('accepts emails on the company domain', async () => {
    const dto = new TestDto();
    dto.email = 'jane.doe@ministryofprogramming.com';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects emails on other domains', async () => {
    const dto = new TestDto();
    dto.email = 'jane.doe@example.com';

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isCompanyEmail).toBe(
      'Email must use @ministryofprogramming.com domain',
    );
  });

  it('rejects domain suffix matches without @ separator', async () => {
    const dto = new TestDto();
    dto.email = 'notanemailministryofprogramming.com';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
