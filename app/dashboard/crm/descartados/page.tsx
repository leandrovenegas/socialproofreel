import React from 'react';
import CrmClient from '../CrmClient';
import { fetchCrmData } from '../crm-loader';

export const revalidate = 0; // Disable static rendering

export default async function DescartadosPage(props: {
  searchParams: Promise<{ page?: string; rubro?: string; filter?: string }>;
}) {
  const resolvedSearchParams = await props.searchParams;
  
  const {
    rawLeads,
    count,
    page,
    rubro,
    rubrosList,
    stats,
    pageSize,
  } = await fetchCrmData('descartado', resolvedSearchParams);

  return (
    <CrmClient
      initialLeads={rawLeads}
      totalCount={count}
      currentPage={page}
      pageSize={pageSize}
      currentRubro={rubro}
      rubros={rubrosList}
      stats={stats}
      viewType="descartados"
    />
  );
}
