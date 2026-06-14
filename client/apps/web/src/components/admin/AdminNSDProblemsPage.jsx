import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  deleteNSDProblemRequest,
  fetchNSDProblemsRequest,
  saveNSDProblemRequest,
} from '../../store/slices/nsdProblemSlice';
import NSDProblemList from './nsd-problem/NSDProblemList';
import NSDProblemModal from './nsd-problem/NSDProblemModal';

export default function AdminNSDProblemsPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { problems, total, page, loading, saving } = useSelector((state) => state.nsdProblem);
  const [selected, setSelected] = useState(null);
  const isModalOpen = selected !== null;

  useEffect(() => {
    dispatch(fetchNSDProblemsRequest(1));
  }, [dispatch]);

  const handlePageChange = (targetPage) => dispatch(fetchNSDProblemsRequest(targetPage));

  const handleSave = (dto) => {
    dispatch(saveNSDProblemRequest({ id: selected?.id ?? null, dto, currentPage: page }));
    setSelected(null);
  };

  const handleDelete = (id) => {
    if (!confirm(t('adminSdProblems.confirmDelete'))) return;
    dispatch(deleteNSDProblemRequest({ id }));
  };

  return (
    <>
      <NSDProblemList
        problems={problems}
        loading={loading}
        page={page}
        total={total}
        limit={10}
        onPageChange={handlePageChange}
        onCreateNew={() => setSelected(undefined)}
        onEdit={(problem) => setSelected(problem)}
        onDelete={handleDelete}
      />
      {isModalOpen && (
        <NSDProblemModal
          problem={selected}
          saving={saving}
          onSave={handleSave}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
