import { axiosPrivate } from './axiosPrivate';

const headVotingService = {
  getElections: async () => {
    const response = await axiosPrivate.get('/head/voting');
    return response.data;
  },

  createElection: async (electionData) => {
    const response = await axiosPrivate.post('/head/voting', electionData);
    return response.data;
  },

  getTargetOptions: async () => {
    const response = await axiosPrivate.get('/head/voting/target-options');
    return response.data;
  },

  deleteElection: async (electionId) => {
    const response = await axiosPrivate.delete(`/head/voting/${electionId}`);
    return response.data;
  },

  updateElection: async (electionId, electionData) => {
    const response = await axiosPrivate.put(`/head/voting/${electionId}`, electionData);
    return response.data;
  },

  closeElection: async (electionId) => {
    const response = await axiosPrivate.put(`/head/voting/${electionId}/close`);
    return response.data;
  }
};

export default headVotingService;
