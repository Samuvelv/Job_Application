import React, { useEffect, useState } from 'react';
import { LanguageService } from '../core/services/language.service';
import { TranslateService } from '@ngx-translate/core';
import { translatePlainString } from '../utils/localizationHelper';

interface CandidateData {
  name: string;
  personalDetails: {
    address: string;
    phone: string;
  };
  experience: Array<{
    company: string;
    role: string;
    description: string;
  }>;
  skills: string[];
  customFields: Record<string, string>;
}

type Props = {
  candidateData: CandidateData;
  languageService: LanguageService;
  translate: TranslateService;
};

const CandidateViewPage: React.FC<Props> = ({ candidateData, languageService, translate }) => {
  const [localizedCandidateData, setLocalizedCandidateData] = useState<CandidateData | null>(null);

  useEffect(() => {
    // Dynamically resolve translations based on selected language
    const transformToLocalizedData = (data: CandidateData): CandidateData => {
      return {
        name: translatePlainString(data.name, translate),
        personalDetails: {
          address: translatePlainString(data.personalDetails?.address, translate),
          phone: data.personalDetails?.phone,
        },
        experience: data.experience.map((exp) => ({
          company: translatePlainString(exp.company, translate),
          role: translatePlainString(exp.role, translate),
          description: translatePlainString(exp.description, translate),
        })),
        skills: data.skills.map((skill) => translatePlainString(skill, translate)),
        customFields: Object.keys(data.customFields).reduce((acc: Record<string, string>, key: string) => {
          acc[key] = translatePlainString(data.customFields[key], translate);
          return acc;
        }, {}),
      };
    };

    setLocalizedCandidateData(transformToLocalizedData(candidateData));
  }, [candidateData, languageService.currentLang]); // Update on language change or new API data

  if (!localizedCandidateData) return <p>Loading...</p>;

  return (
    <div>
      <h1>{localizedCandidateData.name}</h1>
      <section>
        <h2>{translatePlainString('Personal Details', translate)}</h2>
        <p>
          {translatePlainString('Address', translate)}:{' '}
          {localizedCandidateData.personalDetails?.address}
        </p>
        <p>
          {translatePlainString('Phone', translate)}:{' '}
          {localizedCandidateData.personalDetails?.phone}
        </p>
      </section>

      <section>
        <h2>{translatePlainString('Experience', translate)}</h2>
        {localizedCandidateData.experience.map((exp, index) => (
          <div key={index}>
            <h3>{exp.role}</h3>
            <p>
              {translatePlainString('Company', translate)}:{' '}
              {exp.company}
            </p>
            <p>
              {translatePlainString('Description', translate)}:{' '}
              {exp.description}
            </p>
          </div>
        ))}
      </section>

      <section>
        <h2>{translatePlainString('Skills', translate)}</h2>
        <ul>
          {localizedCandidateData.skills.map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{translatePlainString('Custom Fields', translate)}</h2>
        <ul>
          {Object.entries(localizedCandidateData.customFields).map(([key, value]) => (
            <li key={key}>
              {translatePlainString(key, translate)}: {value}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default CandidateViewPage;